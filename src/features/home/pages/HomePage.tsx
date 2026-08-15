import { useEffect } from 'react'
import { homeContent } from '../data/home'

function HomePage() {
  const { hero, focus, reading, interests, roadmap, toolkit, contact } = homeContent

  useEffect(() => {
    document.title = hero.seoTitle ?? hero.title
    const desc = hero.seoDescription ?? hero.description
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://anuragrai.cv/')
  }, [hero])

  return (
    <>
      <header className="hero section reveal">
        <p className="eyebrow">{hero.eyebrow}</p>
        <h1>{hero.title}</h1>
        <p className="lede">{hero.lede}</p>
        <div className="badge-row">
          {hero.badges?.map((badge) => <span key={badge}>{badge}</span>)}
        </div>
      </header>

      <section className="section reveal">
        <div className="section-head">
          <h2>{focus.title}</h2>
          <p>{focus.description}</p>
        </div>
        <ul className="card-grid">
          {focus.items?.map((item) => (
            <li key={item} className="card">
              <p>{item}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section reveal">
        <div className="section-head">
          <h2>{reading.title}</h2>
          <p>{reading.description}</p>
        </div>
        <ul className="list-panel">
          {reading.readingItems?.map((book, index) => (
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
            <h2>{interests.title}</h2>
            <p>{interests.description}</p>
            <ul>
              {interests.items?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h2>{roadmap.title}</h2>
            <p>{roadmap.description}</p>
            <ol>{roadmap.items?.map((item) => <li key={item}>{item}</li>)}</ol>
          </article>
        </div>
      </section>

      <section className="section reveal">
        <div className="section-head">
          <h2>{toolkit.title}</h2>
          <p>{toolkit.description}</p>
        </div>
        <ul className="toolkit-list" aria-label="Toolkit and workspace details">
          {toolkit.toolkitItems?.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section contact-cta reveal">
        <div className="section-head">
          <h2>{contact.title}</h2>
          <p>{contact.description}</p>
        </div>
        <ul className="contact-links" aria-label="Contact links">
          {contact.links?.map((link) => {
            const isExternal = link.href.startsWith('http')
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noreferrer' : undefined}
                >
                  {link.label}
                </a>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}

export default HomePage
