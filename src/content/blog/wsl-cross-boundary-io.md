---
title: "Fixing Slow WSL File I/O with 9P msize Tuning"
date: "2026-03-31"
excerpt: "A practical deep dive into WSL cross-boundary 9P performance: where throughput was lost, how Linux and WSL limits interact, and why precise cap tuning achieved near-2x gains."
tags: [wsl, windows, 9p]
published: true
publishAt: ""
---

Cross-boundary file I/O in WSL was slowing down my daily workflow. Compute was fast, tooling was fast, but moving data between Linux and Windows remained a bottleneck.

I fixed this in commit [`badaa3271343`](https://github.com/Dark-Matter7232/WSL/commit/badaa3271343) by tuning 9P limits based on actual source-level constraints in both WSL and Linux.

This post explains what changed and why, in plain engineering terms.

> [!INFO]
> This was an in-place tuning pass on active WSL paths, not a transport-switch project.

![9P transport tuning benchmark visual](/blog/wsl-9p-transport-tuning.svg "Throughput before and after 9P msize and buffer tuning")

## Background: what 9P does in WSL

WSL uses the 9P protocol for cross-boundary file operations.

Think of 9P as the message format used when one side asks the other side to do file work (open, read, write, stat, readdir, etc.).

That means throughput depends not only on storage speed, but also on:

- how large each 9P message can be
- how messages are negotiated
- transport-level limits and buffers underneath

## The key knob: `msize`

`msize` is the payload size for 9P packets on the client side.

- smaller `msize` -> more packets for the same transfer
- larger `msize` -> fewer packets, less protocol overhead

But `msize` is bounded.

From Linux kernel behavior (`net/9p/client.c`)[^client]:

1. requested `msize` is clamped to transport `maxsize`
2. then `TVERSION` negotiation can reduce it again to what the server accepts

So effective `msize` is always bounded by client request, transport max, and server negotiation.

```c
// effective msize is bounded in practice
effective_msize = min(requested_msize, transport_maxsize, negotiated_server_msize);
```

## Constraint that shaped this work

> [!NOTE]
> In this WSL context, `trans=fd` was the active path. `trans=virtio` can be faster in theory, but that route is disabled upstream on WSL side due to an undisclosed bug.[^commit]

So this was not a transport-switch project. It was an in-place optimization of active paths.

## Root cause

Throughput loss came from conservative caps that did not match real limits:

1. guest-to-host request cap was low on `\\wsl$` path
2. `trans=fd` negotiated below host-allowed maximum
3. virtio-mounted path used a conservative value below transport-safe limit
4. protocol sizing and socket allocation were effectively coupled in fd path

## Implementation details

### 1) Guest -> host (`Windows -> \\wsl$`)

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

Why this change:

In WSL plan9 handler, `Tversion` size is clamped using this constant. If this cap is low, larger operations fragment earlier than necessary. Raising it removes that artificial ceiling.

### 2) Host -> guest (`trans=fd`)

Files:

- `src/linux/init/drvfs.cpp`
- `src/linux/init/main.cpp`
- `src/shared/inc/lxinitshared.h`

Protocol side:

- before: effectively `64 KiB`
- after: `256 KiB` (`262,144`) via `LX_INIT_UTILITY_VM_PLAN9_MSIZE_FD`

Why exactly `256 KiB`:

Because `262,144` is the Windows host negotiation cap for this path. So `256 KiB` is the highest useful value allowed by host negotiation.

Transport buffer side:

- before: `LX_INIT_UTILITY_VM_PLAN9_BUFFER_SIZE = 64 KiB`
- after: `LX_INIT_UTILITY_VM_PLAN9_BUFFER_SIZE = 128 KiB`

```collapse-c
// @title: fd path constants (before -> after)
LX_INIT_UTILITY_VM_PLAN9_MSIZE_FD: 65536 -> 262144
LX_INIT_UTILITY_VM_PLAN9_BUFFER_SIZE: 65536 -> 131072
```

Why decoupling was necessary:

`msize` and socket buffer solve different problems:

- `msize`: protocol payload size
- socket buffer: transport queue memory behavior

Previously they were effectively tied together. That forces a tradeoff: either low protocol throughput or aggressive buffer sizing. The patch separates these knobs so each can be tuned to its own constraint.

Why `128 KiB` buffer:

It was increased from the previous value to improve continuous chunk streaming, so transfers are less likely to break into smaller chunks under pressure. It was intentionally kept at `128 KiB` (not `256 KiB`) so that, with Linux internal socket-buffer doubling, it aligns with the `trans=fd` protocol-side `msize` target of `256 KiB` (`262,144`).

### 3) Host -> guest (`trans=virtio` path)

File: `src/linux/init/drvfs.cpp`

- before: `msize=262144`
- after: `msize=512000`

Why exactly `512000`:

Linux 9P virtio transport (`net/9p/trans_virtio.c`) defines maxsize as:

- `PAGE_SIZE * (VIRTQUEUE_NUM - 3)`

With `PAGE_SIZE=4096` and `VIRTQUEUE_NUM=128`, that evaluates to `512000` exactly. So this value is transport-derived, not heuristic.

> [!TIP]
> This cap is transport-derived from kernel constraints, so it is safer than picking an arbitrary larger value.

```collapse-text
# @title: Virtio maxsize derivation
PAGE_SIZE * (VIRTQUEUE_NUM - 3)
4096 * (128 - 3) = 512000
```

## Why this improved performance

All changes reduce avoidable packet fragmentation in hot paths.

That leads to:

- fewer protocol messages
- fewer cross-boundary transitions
- better sustained throughput

## Benchmark results

| Direction | Before | After | Improvement |
| --- | --- | --- | --- |
| WSL -> `C:\` | 124 MB/s | 238 MB/s | +92% |
| `C:\` -> WSL | 185 MB/s | 365 MB/s | +97% |

- WSL -> `C:\`: `124 MB/s -> 238 MB/s` (`+92%`)
- `C:\` -> WSL: `185 MB/s -> 365 MB/s` (`+97%`)

Near-2x in both directions.

## Lessons learned

This was not a micro-optimization trick. It was limit alignment across layers.

When protocol limits, transport limits, and host-side constraints disagree, performance suffers. Once those boundaries are matched correctly, even small code changes can produce large gains.

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
