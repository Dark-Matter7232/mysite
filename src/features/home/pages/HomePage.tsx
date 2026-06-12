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
        <h1>Learning cybersecurity from zero, in the open.</h1>
        <p className="lede">
          Hey, I'm Anurag Rai: a 20-year-old Computer Science undergrad, Linux geek,
          audiophile, and tinkerer. For the last few years I have been comfortable in
          systems work, terminals, and small Unix-style utilities. I am now pivoting
          into cybersecurity. I have no prior security experience and I am not going to
          pretend otherwise. I do not know what most of this field looks like yet. What
          I do have is a goal, the patience to read, and a willingness to fail labs in
          public until things start to click. This site is the honest log of that
          beginning.
        </p>
        <div className="badge-row">
          <span>Cybersecurity beginner</span>
          <span>Linux-first</span>
          <span>Learning in the open</span>
          <span>Windows + WSL workflow</span>
        </div>
      </header>

      <section className="section reveal">
        <div className="section-head">
          <h2>Current Focus</h2>
          <p>What I am actually doing each day right now.</p>
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
            <p>A few things that keep my perspective broad while I learn.</p>
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
                Finish a structured foundations pass on HTTP, cookies and sessions, the
                browser security model, basic SQL, and JavaScript for exploitation, so
                that I can actually understand what the labs are asking of me.
              </li>
              <li>
                Clear every Apprentice-tier lab on the PortSwigger Web Security Academy,
                then start moving through Practitioner-tier labs, one vulnerability class
                at a time.
              </li>
              <li>
                Write a short post on the blog after every meaningful lab or topic, so the
                learning trail is public and so I can re-read my own confusion later.
              </li>
              <li>
                Sit the Burp Suite Certified Practitioner exam once the Practitioner labs
                feel routine, and treat any first-attempt failure as more information, not
                a verdict.
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
            If you are also early in cybersecurity, or further along and willing to point a
            beginner in better directions, I would like to hear from you.
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
