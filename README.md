# MySite Portfolio

Personal portfolio for [anuragrai.cv](https://anuragrai.cv), documenting my transition into full stack development from a systems background and systems-first mindset.

The page is structured as a living journey log, not a static resume. It captures what I am learning, what I am building, and how I approach software through reliability, performance, and clean architecture.

## What This Site Covers

- Current focus areas as I learn React, JavaScript, and TypeScript.
- A reading shelf with short personal reflections for each book.
- A 2026 roadmap with practical project goals.
- Toolkit and workspace details (Windows + WSL, ARM64 Snapdragon X laptop, dual display setup).
- A contact section for collaboration on systems-oriented full stack work.

## Tech Stack

- React + TypeScript + Vite
- Bun as the primary package manager and script runner
- ESLint for linting

## Bun-First Commands

Install dependencies:

```bash
bun install
```

Run dev server:

```bash
bun run dev
```

Build for production:

```bash
bun run build
```

Preview production build:

```bash
bun run preview
```

Run lint checks:

```bash
bun run lint
```

## SEO and Crawl Files

- Canonical domain metadata is set to `https://anuragrai.cv/` in [index.html](index.html).
- Search crawler rules are in [public/robots.txt](public/robots.txt).
- Sitemap is in [public/sitemap.xml](public/sitemap.xml).

## Clean Publish Flow

This repository is kept clean before initialization/publish (no `dist/`, no `node_modules/`).

1. Install dependencies: `bun install`
2. Run lint: `bun run lint`
3. Create production build: `bun run build`
4. Preview locally if needed: `bun run preview`
5. Initialize and publish: `git init` and push to your remote

## Project Intent

This project is meant to evolve continuously as skills, projects, and technical writeups grow. Content and layout are intentionally tuned to communicate progression from systems engineering habits into end-to-end product development.
