---
title: "Why I Use WSL Instead of Bare Metal Linux"
date: "2026-04-03"
excerpt: "How I stopped breaking my Linux systems, embraced Windows as a productivity constraint, and used WSL to get actual work done."
tags: [wsl, linux, engineering, workflow]
published: true
publishAt: ""
---

I have a tendency to get lost in my tools. Given a highly configurable system, I will inevitably spend more time tweaking, tuning, and maximizing performance than actually building software.

For nearly a decade, Linux was my primary desktop environment. I started with Slax, the only Linux distribution my dad's old ThinkPad could boot, bought from a physical software vendor because cheap internet didn't exist in India yet. From there, I moved to Ubuntu Unity, then Mint, Puppy Linux, Arch, Artix (to be edgy and anti-systemd), Void (because I love runit and hate myself), and eventually Linux From Scratch (LFS). 

Somewhere along the way, the system itself became the project.

![My Linux distribution journey over the years](/blog/linux_distro_journey.svg "The inevitable path to breaking my own system")

## The Productivity Paradox

Between distributions, I spent my time shaving milliseconds off boot times. I bypassed bootloaders entirely to rely on the kernel as an EFI stub. I aggressively stripped my initramfs. I compiled my packages with LTO (Link-Time Optimization) and `-O3` flags just to see if I could.

This obsessive behavior bled into everything else. When I wanted to play games on Linux, instead of actually playing them, I would spend hours compiling Wine from source with experimental community patches. I built custom kernels with a higher high-resolution timer frequency to improve UI and input responsiveness. I meticulously merged (now-defunct) kernel-side `fsync` patches for Wine just to eke out a few more frames per second.

The result? I broke my system frequently.

![The productivity paradox of tuning everything over writing code](/blog/productivity_paradox.svg "Time spent configuring vs time spent coding")

> [!NOTE]
> Time that could have gone into shipping code or expanding my knowledge base was instead wasted on rescuing broken installs from a tty prompt, or sometimes chrooting from a live USB.

I needed a system that actively prevented me from doing this. 

## Windows as a Constraint

Enter Windows. It is famously inflexible and difficult to deeply customize. Ironically, that makes it the perfect operating system for someone like me. 

The inability to modify the core system makes it vastly less susceptible to breakage. It acts as a strict productivity boundary, forcing me to focus my time on actual development work rather than fixing my environment.

That isn't to say I don't try. After all, I am a tinkerer at heart. Give me a sealed metal box, and I will inevitably rip a few holes in it. The difference here is that Windows restricts the blast radius of that tinkering.

## The Escape Hatch: WSL

![WSL Architecture acting as a constraint](/blog/wsl_architecture.svg "The contained blast radius of WSL")

To actually write code, I use the best possible compromise on Windows: the Windows Subsystem for Linux (WSL).

It gives me the *nix environment I need without risking the stability of the host operating system that runs my browser, communications, and UI. If my WSL environment breaks, I can reset it and reconstruct it in minutes.

> [!INFO]
> Of course, old habits die hard. Even in WSL, I use custom builds compiled with aggressive optimization flags, a custom streamlined kernel, and my own patches to [fix 9P msize negotiation](/blog/wsl-cross-boundary-io). But the potential for system-wide issues is completely contained.

## The Hardware Reality

Beyond the software boundaries, there are real hardware limitations driving this setup. 

I currently use a Snapdragon X laptop on the go, alongside a desktop workstation. Right now, running a fully featured, bare-metal Linux environment on the Snapdragon X architecture is still a work in progress. 

I need to keep both of these workstations seamlessly in sync. 

WSL provides the easiest, most reproducible path to maintaining identical development environments across both x86 and ARM hardware, while operating within the limitations and constraints I've imposed on myself. 

> [!SUCCESS]
> For me, WSL isn't the purest Linux experience, but it is the one that keeps me from sabotaging myself.
