---
title: "Fixing Slow WSL File I/O with 9P msize Tuning"
date: "2026-03-31"
excerpt: "How auditing 9P protocol limits between Linux and Windows in WSL led to a 2x improvement in cross-boundary file I/O speeds."
tags: [wsl, windows, 9p]
published: true
publishAt: ""
---

Cross-boundary file I/O in WSL has always been a noticeable bottleneck in my workflow. Moving large amounts of data between Linux and Windows always felt sluggish compared to native operations.

I pushed a fix for this in commit [`badaa3271343`](https://github.com/Dark-Matter7232/WSL/commit/badaa3271343). By auditing the actual source-level constraints in both WSL and Linux, I dug into the 9P limits and adjusted them to match the underlying transport layers.

> [!NOTE]
> Just a heads up: this wasn't some massive rewrite to switch transport protocols. It was strictly an in-place tuning pass to get the absolute most out of the existing WSL paths.

![9P transport tuning benchmark visual](/blog/wsl-9p-transport-tuning.svg "Throughput before and after 9P msize and buffer tuning")

## Background: what 9P does in WSL

WSL uses the 9P protocol to handle cross-boundary file operations. Every time you open, read, write, or stat a file, messages are passed back and forth between the host and guest using 9P.

This means the actual transfer throughput isn't just up to raw disk speed. It's bottlenecked by how large a single 9P message can be, how those messages are negotiated, and the transport-level buffers sitting underneath the protocol.

## The Key Knob: `msize`

`msize` is the payload size for 9P packets on the client side.

- smaller `msize` -> more packets for the same transfer
- larger `msize` -> fewer packets, less protocol overhead

But `msize` is bounded.

From Linux kernel behavior (`net/9p/client.c`)[^client]:

1. requested `msize` is clamped to transport `maxsize`
2. then `TVERSION` negotiation can reduce it again to what the server accepts

So in practice, the real `msize` is always the minimum of your request, the transport limit, and the server's limit:

```c
// effective msize is bounded in practice
effective_msize = min(requested_msize, transport_maxsize, negotiated_server_msize);
```

## Working With What We Have

WSL currently falls back to `trans=fd` for its active 9P transport. The `trans=virtio` path is theoretically faster, but that route is currently disabled upstream by Microsoft due to an undisclosed bug.[^commit]

Because swapping to a better transport wasn't an option, I had to optimize the existing `trans=fd` paths. When I looked at the codebase, I found the throughput loss was almost entirely due to overly conservative hardcoded caps. The guest-to-host request cap on `\\wsl$` was incredibly low, and the `trans=fd` path was negotiating way below what the host actually allowed. On top of that, the protocol payload size and socket memory allocation were awkwardly tied together. 

I went through the constraints one by one and untangled them.

### 1. Guest to Host (`Windows -> \wsl$`)

File: `src/linux/plan9/p9handler.cpp`

- before: `MaximumRequestBufferSize = 256 KiB`
- after: `MaximumRequestBufferSize = 1 MiB`

```collapse-cpp
// @title: p9handler.cpp cap change
// before
MaximumRequestBufferSize = 256 * 1024;

// after
MaximumRequestBufferSize = 1024 * 1024;
```

In the WSL plan9 handler, the `Tversion` size is clamped using this constant. If this cap is left too low, larger operations fragment way earlier than necessary. Raising it up to 1 MiB removes that artificial ceiling.

### 2. Host to Guest (`trans=fd`)

Files:

- `src/linux/init/drvfs.cpp`
- `src/linux/init/main.cpp`
- `src/shared/inc/lxinitshared.h`

Protocol side:

- before: effectively `64 KiB`
- after: `256 KiB` (`262,144`) via `LX_INIT_UTILITY_VM_PLAN9_MSIZE_FD`

I chose `256 KiB` because `262,144` is the Windows host negotiation cap for this path. Bumping it to `256 KiB` sets it to the highest useful value allowed by the host negotiation logic.

Transport buffer side:

- before: `LX_INIT_UTILITY_VM_PLAN9_BUFFER_SIZE = 64 KiB`
- after: `LX_INIT_UTILITY_VM_PLAN9_BUFFER_SIZE = 128 KiB`

```collapse-c
// @title: fd path constants (before -> after)
LX_INIT_UTILITY_VM_PLAN9_MSIZE_FD: 65536 -> 262144
LX_INIT_UTILITY_VM_PLAN9_BUFFER_SIZE: 65536 -> 131072
```

The main flaw here was that `msize` (the protocol payload size) and the socket buffer (handling transport queue memory behavior) were tied together. This forced a tradeoff where you either had to accept low protocol throughput or risk aggressive buffer sizing. I wrote a patch to separate these knobs so they could be tuned independently.

I pushed the buffer from 64 KiB to `128 KiB` to improve chunk streaming and prevent transfers from fragmenting under pressure. I intentionally stopped at 128 KiB instead of maxing it out to 256 KiB, because Linux internally doubles the socket buffer. A 128 KiB buffer naturally aligns with the `trans=fd` protocol-side `msize` target of `256 KiB` (`262,144`).

### 3. Host to Guest (`trans=virtio` path)

File: `src/linux/init/drvfs.cpp`

- before: `msize=262144`
- after: `msize=512000`

This specific number comes straight from the Linux 9P virtio transport (`net/9p/trans_virtio.c`), which defines maxsize as:

- `PAGE_SIZE * (VIRTQUEUE_NUM - 3)`

With `PAGE_SIZE=4096` and `VIRTQUEUE_NUM=128`, that evaluates to `512000` exactly.

> [!TIP]
> Because this cap is derived directly from kernel constraints, it's safer than arbitrarily picking a larger value.

```collapse-text
# @title: Virtio maxsize derivation
PAGE_SIZE * (VIRTQUEUE_NUM - 3)
4096 * (128 - 3) = 512000
```

## The Results

At the end of the day, all these tweaks do is reduce avoidable packet fragmentation in hot paths. Fewer fragments mean fewer protocol messages, which naturally leads to fewer cross-boundary transitions and significantly higher sustained throughput.

| Direction | Before | After | Improvement |
| --- | --- | --- | --- |
| WSL -> `C:\` | 124 MB/s | 238 MB/s | +92% |
| `C:\` -> WSL | 185 MB/s | 365 MB/s | +97% |

That's a near-2x improvement in both directions.

## The Takeaway

This whole debugging session was a good reminder of how much performance gets bottlenecked simply by conservative defaults. 

When I dug into the source code, I realized the fix didn't require pulling apart the architecture or rewriting drivers. It just came down to matching the 9P caps to what the underlying transport could actually handle. 

Sometimes, resolving a massive bottleneck isn't about complex micro-optimizations. It is just about looking under the hood and bumping a few hardcoded numbers.

## Change summary (before -> after)

- `p9handler.cpp` `MaximumRequestBufferSize`: `256 KiB (262,144)` -> `1 MiB (1,048,576)`
- `drvfs.cpp` `trans=fd` mount `msize`: `64 KiB (65,536)` behavior -> `256 KiB (262,144)`
- `lxinitshared.h` `LX_INIT_UTILITY_VM_PLAN9_BUFFER_SIZE`: `64 KiB (65,536)` -> `128 KiB (131,072)`
- `lxinitshared.h` `LX_INIT_UTILITY_VM_PLAN9_MSIZE_FD`: newly introduced as `256 KiB (262,144)` for explicit fd protocol sizing
- `drvfs.cpp` `trans=virtio` mount `msize`: `262,144` -> `512,000`

## References

- Commit: <https://github.com/Dark-Matter7232/WSL/commit/badaa3271343>
- Patch: <https://github.com/Dark-Matter7232/WSL/commit/badaa3271343.patch>
- Linux 9P docs: <https://docs.kernel.org/filesystems/9p.html>
- Linux 9P client logic: `linux/net/9p/client.c`
- Linux virtio 9P transport logic: `linux/net/9p/trans_virtio.c`
- Linux fd transport logic: `linux/net/9p/trans_fd.c`
- WSL init + plan9 paths: `WSL/src/linux/init/` and `WSL/src/linux/plan9/`

[^client]: Request clamping and negotiation path reference: `linux/net/9p/client.c`.
[^commit]: Upstream-path constraint and patch context: <https://github.com/Dark-Matter7232/WSL/commit/badaa3271343>.
