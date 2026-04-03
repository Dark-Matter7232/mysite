import { useEffect } from 'react'
import { focusAreas, interests, readingList, toolkit } from '../data/home'

function HomePage() {
  useEffect(() => {
    document.title = 'Anurag Rai | Portfolio'
    const desc = "Anurag Rai's portfolio documenting his transition from systems work to full stack development with projects, roadmap, reading notes, and technical focus areas."
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://anuragrai.cv/')
  }, [])

  return (
    <>
      <header className="hero section reveal">
        <p className="eyebrow">Anurag Rai / Const Coccinelle / Dark-Matter7232</p>
        <h1>Building thoughtful full stack products from the terminal up.</h1>
        <p className="lede">
          Hey, I'm Anurag Rai: a 20-year-old Computer Science undergrad, Linux geek,
          audiophile, programmer, and system administrator. I enjoy writing minimalist
          Unix-style utilities and working with low-level OS components like the kernel
          and coreutils. This portfolio is the start of my full stack journey and a living
          log of what I am learning.
        </p>
        <div className="badge-row">
          <span>Linux-first</span>
          <span>System-minded</span>
          <span>Full stack in progress</span>
          <span>Windows + WSL workflow</span>
        </div>
      </header>

      <section className="section reveal">
        <div className="section-head">
          <h2>Current Focus</h2>
          <p>What I am actively studying and building right now.</p>
        </div>
        <ul className="card-grid">
          {focusAreas.map((item) => (
            <li key={item} className="card">
              <p>{item}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section reveal">
        <div className="section-head">
          <h2>Reading Shelf</h2>
          <p>Reading keeps me steady and curious when code gets chaotic.</p>
        </div>
        <ul className="list-panel">
          {readingList.map((book, index) => (
            <li key={book.title}>
              <span>
                {index + 1}. {book.title}
              </span>
              <small>{book.author}</small>
              <p>{book.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section reveal">
        <div className="split-grid">
          <article className="panel">
            <h2>Beyond The Keyboard</h2>
            <p>A few things that keep my perspective broad while I build software.</p>
            <ul>
              {interests.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h2>2026 Build Roadmap</h2>
            <ol>
              <li>
                Build a real-time home server dashboard in React that streams live system
                stats from the Linux /proc interface.
              </li>
              <li>
                Move into React Native after completing a few core React projects, then ship
                an Android app to securely configure specific sysctl parameters on my home
                server.
              </li>
              <li>
                Add a dedicated project write-up section to this site with a technical deep
                dive for every build.
              </li>
              <li>
                Complete Striver's DSA cheat sheet entirely in TypeScript, with clean
                implementations and notes.
              </li>
            </ol>
          </article>
        </div>
      </section>

      <section className="section reveal">
        <div className="section-head">
          <h2>Toolkit And Workspace</h2>
          <p>Everyday setup choices behind my coding and systems work.</p>
        </div>
        <ul className="toolkit-list" aria-label="Toolkit and workspace details">
          {toolkit.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section contact-cta reveal">
        <div className="section-head">
          <h2>Let's Connect</h2>
          <p>
            If you want to collaborate on full stack products, systems tools, or open source
            work, reach out here.
          </p>
        </div>
        <ul className="contact-links" aria-label="Contact links">
          <li>
            <a href="https://github.com/Dark-Matter7232" target="_blank" rel="noreferrer">
              GitHub: @Dark-Matter7232
            </a>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/in/anurag-rai-1588391aa/"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn: anurag-rai-1588391aa
            </a>
          </li>
          <li>
            <a href="mailto:me@anuragrai.cv">Email: me@anuragrai.cv</a>
          </li>
        </ul>
      </section>
    </>
  )
}

export default HomePage
