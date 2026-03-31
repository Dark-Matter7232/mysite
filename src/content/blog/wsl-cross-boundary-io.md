---
title: "Why WSL File I/O Feels Slow (and the 9P Fix That Nearly Doubled Throughput)"
date: "2026-03-31"
excerpt: "A practical breakdown of why WSL cross-boundary file operations feel slow, the 9P bottlenecks behind it, and the tuning changes that produced near-2x throughput gains."
tags: [wsl, windows, 9p]
published: true
publishAt: ""
---

You run `npm install` in WSL on a repo living on `C:\`, and your terminal just sits there.

`git checkout` feels sticky. Bulk copies crawl. Simple file metadata calls add up into visible lag.

If that sounds familiar, this is the exact bottleneck I chased.

I pushed a fix in commit [`badaa3271343`](https://github.com/Dark-Matter7232/WSL/commit/badaa3271343) after auditing where cross-boundary throughput was being capped in both WSL and Linux 9P paths.

The short version: this was not a transport rewrite. It was a targeted tuning pass that aligned protocol limits with what the transport could already handle, removing avoidable fragmentation and overhead.

> [!NOTE]
> This post is about tuning existing WSL paths, not replacing 9P or changing overall WSL architecture.

## What this post covers

1. A simple mental model for where WSL cross-boundary overhead comes from
2. The specific caps that limited throughput
3. The concrete changes made in WSL code
4. Benchmarks, results, and why the improvement happened
5. Practical advice you can reuse when debugging similar bottlenecks

> [!IMPORTANT]
> **Core insight in one line:**
> `effective_msize = min(requested_msize, transport_maxsize, negotiated_server_msize)`
>
> Most of the slowdown came from layered caps fighting each other. Raising one limit helped only when all the other limits were aligned.

![9P transport tuning benchmark visual](/blog/wsl-9p-transport-tuning.svg "Throughput before and after 9P msize and buffer tuning")

## The pain in real workflows

Cross-boundary slowdown is not theoretical. It hits common developer loops:

- package managers (`npm`, `pnpm`, etc.) touching many small files
- `git` operations over large working trees
- toolchains doing repeated metadata reads (`stat`, `open`, `readdir`)
- bulk copy/sync between WSL and Windows paths

When these operations cross the Linux/Windows boundary, latency and fragmentation compound quickly.

## Mental model first: where the slowdown comes from

WSL uses the 9P protocol to handle cross-boundary file operations. Every time you open, read, write, or stat a file, messages are passed back and forth between the host and guest using 9P.

So throughput is not just "disk speed." It is also constrained by packet sizing and queue behavior.

Simple model:

```text
larger transfer
  -> split into 9P messages
  -> each message crosses the boundary
  -> more messages = more overhead

effective throughput ~= useful bytes / (protocol overhead + boundary transitions + queue stalls)
```

And the key point: if your payload size is capped too low, you force extra fragmentation even when the transport could carry more.

### Boundary flow at a glance

```text
[Linux process]
	|
	| read/write/stat
	v
[9P client in guest] --(packet size capped by msize)--> [transport queue/buffer] ---> [Windows host 9P side]
										     |
										     v
									     [NTFS or host FS]
```

## The key knob: `msize`

`msize` is the payload size for 9P packets on the client side.

- smaller `msize` -> more packets for the same transfer
- larger `msize` -> fewer packets and lower per-byte protocol overhead

But `msize` is bounded.

From Linux kernel behavior (`net/9p/client.c`)[^client]:

1. requested `msize` is clamped to transport `maxsize`
2. then `TVERSION` negotiation can reduce it again to what the server accepts

So in practice, the real `msize` is always the minimum of your request, the transport limit, and the server's limit:

```c
// effective msize is bounded in practice
effective_msize = min(requested_msize, transport_maxsize, negotiated_server_msize);
```

This one equation explains most of the bottleneck: setting a larger value in one place does nothing if another layer silently clamps it.

## Constraints: what I could and could not change

Micro-summary: I could not swap transports, so the win had to come from removing avoidable limits in the active path.

WSL currently falls back to `trans=fd` for its active 9P transport. The `trans=virtio` path is theoretically faster, but that route is currently disabled upstream by Microsoft due to an undisclosed bug.[^commit]

Because transport replacement was off the table, I optimized `trans=fd` and related caps in-place.

When I traced the path, the throughput loss came from conservative hardcoded ceilings:

- guest-to-host request cap on `\\wsl$` was low
- `trans=fd` negotiation was effectively stuck far below host allowance
- protocol payload sizing and socket memory sizing were coupled, which blocked clean tuning

In other words, the system had headroom, but configuration ceilings prevented reaching it.

## What changed

Micro-summary: I raised each bottleneck to the highest constraint-backed value, then decoupled protocol payload tuning from transport buffer tuning.

I went through each cap and adjusted it to match real transport constraints.

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

In the WSL plan9 handler, `Tversion` size is clamped using this constant. At `256 KiB`, larger operations fragmented earlier than necessary. Raising it to `1 MiB` removes that artificial early ceiling for this direction.

Why this matters: fewer early splits on large operations.

### 2. Host to Guest (`trans=fd`)

Files:

- `src/linux/init/drvfs.cpp`
- `src/linux/init/main.cpp`
- `src/shared/inc/lxinitshared.h`

Protocol side:

- before: effectively `64 KiB`
- after: `256 KiB` (`262,144`) via `LX_INIT_UTILITY_VM_PLAN9_MSIZE_FD`

I chose `256 KiB` because `262,144` is the host negotiation ceiling for this path. This sets protocol payload size to the highest useful value accepted by negotiation.

Transport buffer side:

- before: `LX_INIT_UTILITY_VM_PLAN9_BUFFER_SIZE = 64 KiB`
- after: `LX_INIT_UTILITY_VM_PLAN9_BUFFER_SIZE = 128 KiB`

```collapse-c
// @title: fd path constants (before -> after)
LX_INIT_UTILITY_VM_PLAN9_MSIZE_FD: 65536 -> 262144
LX_INIT_UTILITY_VM_PLAN9_BUFFER_SIZE: 65536 -> 131072
```

The core flaw here was coupling: `msize` (protocol payload) and socket buffer sizing (queue behavior) were tied together. That forced a bad tradeoff: keep payloads small, or push memory behavior too aggressively. I separated these knobs so protocol and transport could be tuned independently.

I then moved buffer size from `64 KiB` to `128 KiB`. I stopped at `128 KiB` intentionally because Linux internally doubles socket buffer accounting. This lines up naturally with the `256 KiB` protocol-side `msize` target (`262,144`) without overcommitting memory.

Why this matters: larger payloads plus stable queue behavior under sustained transfer.

### 3. Host to Guest (`trans=virtio` path)

File: `src/linux/init/drvfs.cpp`

- before: `msize=262144`
- after: `msize=512000`

This specific number comes straight from the Linux 9P virtio transport (`net/9p/trans_virtio.c`), which defines maxsize as:

- `PAGE_SIZE * (VIRTQUEUE_NUM - 3)`

With `PAGE_SIZE=4096` and `VIRTQUEUE_NUM=128`, that evaluates to `512000` exactly.

> [!TIP]
> This cap comes directly from kernel constraints, which is safer than choosing an arbitrary larger value.

```collapse-text
# @title: Virtio maxsize derivation
PAGE_SIZE * (VIRTQUEUE_NUM - 3)
4096 * (128 - 3) = 512000
```

## Why these changes work

Micro-summary: align every layer, then fragmentation drops naturally.

Each adjustment reduces avoidable fragmentation at a different layer:

- larger negotiated payloads -> fewer 9P messages per transfer
- fewer messages -> fewer boundary transitions and less per-message overhead
- better buffer sizing -> smoother queue behavior under sustained transfer

This is the "aha": throughput improved not from a new architecture, but from removing layered caps that were accidentally fighting each other.

## Benchmarks and results

I benchmarked before and after on the same machine/workload profile used during validation of the patch.

Method summary:

- compared both directions: `WSL -> C:\` and `C:\ -> WSL`
- measured sustained throughput for large sequential transfers
- ran with old constants vs patched constants

Results:

| Direction | Before | After | Improvement |
| --- | --- | --- | --- |
| WSL -> `C:\` | 124 MB/s | 238 MB/s | +92% |
| `C:\` -> WSL | 185 MB/s | 365 MB/s | +97% |

That is near-2x in both directions.

## Practical takeaway

If you are debugging cross-boundary I/O in WSL, start with these questions:

1. Where is `msize` requested?
2. Where is it clamped by transport?
3. What does negotiation actually settle on?
4. Are protocol payload and transport buffer knobs coupled?

Most of the time, your effective ceiling is the minimum of several layers, not the value you set in one config path.

This case is a good reminder: substantial gains can come from reading constraints end-to-end and aligning them, even without changing the high-level architecture.

Memorable rule of thumb: **performance bottlenecks often hide in the minimum, not the maximum.**

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
