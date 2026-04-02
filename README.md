# MySite Portfolio & Blog

Personal portfolio and technical blog for [anuragrai.cv](https://anuragrai.cv), documenting my transition into full stack development from a systems background and systems-first mindset.

The page is structured as a living journey log and engineering blog, not just a static resume. It captures what I am learning, what I am building, and how I approach software through reliability, performance, and clean architecture.

## What This Site Covers

- A fully-featured Markdown blog engine for technical writeups and project postmortems.
- Current focus areas as I learn React, JavaScript, and TypeScript.
- A reading shelf with short personal reflections for each book.
- A 2026 roadmap with practical project goals.
- Toolkit and workspace details (Windows + WSL, ARM64 Snapdragon X laptop, dual display setup).
- A contact section for collaboration on systems-oriented full stack work.

## Tech Stack

- **React 19 + TypeScript + Vite 8**
- **React Router 7**: For declarative client-side routing.
- **Lucide React**: For scalable SVG icons.
- **React Markdown + Remark GFM**: Parsing GitHub Flavored Markdown into native React components.
- **Bun**: For blazing-fast package management, typescript execution, and script running.
- **ESLint**: For strict linting.
- **SSG & Asset Optimization**: A custom pre-render script using `react-dom/server` statically generates all HTML at build time, while an automatic `prebuild` hook compresses all assets via `sharp` for maximum Lighthouse scores without Meta-Framework bloat.
- **Cloudflare Pages**: Deployment target via Wrangler CLI (`bun run deploy`).

## Features

- **Blazing Fast**: Handled seamlessly by React 19 + Vite 8 + Bun.
- **Client-Side Routing**: Smooth, instant page transitions powered by React Router 7.
- **Markdown Blog Engine**: Full markdown blog pipeline featuring YAML frontmatter parsing, interactive carousels, and responsive typography out-of-the-box.
- **Built-in SEO & Discovery**: Automatic generation of `rss.xml` and `sitemap.xml`.
- **System-First Design**: Carefully constructed fluid spring-motion animations mirroring native operating system feel (e.g., iOS).

## Architecture & UI Details

Beyond basic rendering, I've prioritized building fluid, native-feeling micro-interactions specifically tuned for desktop and mobile UX:

- **Fluid Motion**: Hand-tuned transition curves (like `cubic-bezier(0.16, 1, 0.3, 1)`) applied universally.
- **Custom React Collapsibles**: Bypassing the immediate-snap limitations of native HTML `<details>` elements. Components like `CodeBlock` and the Table of Contents `TocGroup` handle `isOpen` state mapped to CSS grids (`grid-template-rows: 0fr -> 1fr`) to achieve buttery smooth height expansions.
- **Lightweight Event Bus**: Global controls (like "Expand / Collapse All Code") bypass prop-drilling and React Context bloat. Instead, they broadcast lightweight Javascript `CustomEvents` (`toggle-all-code`) caught natively by individual isolated components. 
- **Page Route Transitions**: Forcing graceful entrance animations by assigning route keys (`<Outlet key={location.pathname} />`) to trigger CSS `.reveal` animations safely on every navigation.
- **Smart Touch Handling**: A global scroll listener drops active-hover highlights (like chevron arrows) after scrolling >80 pixels to confirm intentional scroll intent and fix iOS Safari sticky-hover artifacts.
- **CSS Grid Carousel**: Crossfading overlapping image assets smoothly in a single CSS responsive grid block for Markdown image galleries defined under ````carousel`.

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

## Markdown Blog Workflow

The site now includes a routed blog section:

- `/blog` for the post list
- `/blog/:slug` for individual posts

Write blog posts as Markdown files in `src/content/blog`.

Each post supports frontmatter:

```md
---
title: "Post title"
date: "2026-03-31"
excerpt: "Short summary"
tags: [react, markdown]
published: true
---
```

Then add your post body in Markdown below the frontmatter. New files are auto-discovered at build time via Vite's `import.meta.glob`.

### Collapsible Code Blocks

Use a code fence language prefixed with `collapse-`:

````md
```collapse-ts
// @title: Optional title shown in summary
const answer = 42
```
````

- `collapse-ts` makes the block collapsible.
- `// @title: ...` (or `# @title: ...`) is optional.
- Every code block (collapsed or normal) includes a copy button.

### Carousels, Callouts, Footnotes, and Figures

Interactive carousels (images fade seamlessly):
````md
```carousel
// @title: Optional Title
/img1.png
/img2.jpg
```
````

Callouts:

```md
> [!NOTE]
> This is a note.
```

Supported labels: `NOTE`, `TIP`, `WARNING`, `INFO`, `CAUTION`, `DANGER`, `SUCCESS`, `BUG`, `EXAMPLE`.

Footnotes (GFM):

```md
Use footnotes like this.[^1]

[^1]: Footnote text.
```

Figure captions:

```md
![Alt text](/blog/visual.png "Measured throughput after tuning")
```

When image `title` is present, it renders as a numbered caption.

### Heading Anchors and Table of Contents

- `##` and `###` headings are auto-collected into a table of contents.
- Headings render anchor links for deep linking.
- TOC includes “Expand all code / Collapse all code” controls.

### Draft Scheduling

In frontmatter, set `publishAt` (ISO date/date-time). Posts remain hidden until that date/time:

```md
publishAt: "2026-04-05T09:00:00Z"
```

Local draft preview:

- Open `/blog/<slug>?preview=1` on localhost.
- Unpublished posts are still hidden in normal site navigation.

### Create a New Blog Skeleton

Generate a draft Markdown post from template:

```bash
bun run blog:new --title "My New Post"
```

Optional arguments:

- `--slug "custom-slug"`
- `--excerpt "Short summary"`
- `--tags "linux,wsl,performance"`

The command creates `src/content/blog/<slug>.md` with `published: false` so drafts stay hidden until ready.

### RSS Feed

RSS is generated to [public/rss.xml](public/rss.xml) via:

```bash
bun run rss:generate
```

It also runs automatically before `bun run build`.

### Additional Post UX

- Inline code can be clicked to copy.
- External links auto-open in a new tab and show `[ext]`.
- Post header shows reading time, word count, and file-based last-updated date.
- Post footer includes Previous/Next navigation smoothly animated buttons and a Back-to-top button.

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
5. Deploy: `bun run deploy`

## Project Intent

This project is meant to evolve continuously as skills, projects, and technical writeups grow. Content and layout are intentionally tuned to communicate progression from systems engineering habits into end-to-end product development.
