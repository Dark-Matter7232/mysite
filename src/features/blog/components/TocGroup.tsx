import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { TocGroupData } from '../utils/toc'

type TocGroupProps = {
  group: TocGroupData
  activeChevron: { id: string; startY: number } | null
  setActiveChevron: (val: { id: string; startY: number } | null) => void
  scrollToHeading: (id: string) => void
}

export function TocGroup({ group, activeChevron, setActiveChevron, scrollToHeading }: TocGroupProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (group.children.length === 0) {
    return (
      <li>
        <a
          href={`#${group.heading.id}`}
          onClick={(e) => {
            e.preventDefault()
            scrollToHeading(group.heading.id)
          }}
        >
          {group.heading.text}
        </a>
      </li>
    )
  }

  return (
    <li>
      <div className="toc-details">
        <div 
          className="toc-summary"
          onClick={() => {
            setActiveChevron({ id: group.heading.id, startY: window.scrollY })
            setIsOpen(!isOpen)
          }}
        >
          <a
            href={`#${group.heading.id}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              scrollToHeading(group.heading.id);
            }}
          >
            {group.heading.text}
          </a>
          <span 
            className={`toc-toggle ${activeChevron?.id === group.heading.id || isOpen ? 'active' : ''}`}
            aria-expanded={isOpen}
          >
            <ChevronRight 
              className="toc-icon" 
              size={16} 
              style={{ 
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', 
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
              }} 
            />
          </span>
        </div>
        <div className={`animated-collapse ${isOpen ? 'open' : ''}`}>
          <div className="animated-collapse-inner">
            <ul>
              {group.children.map((item) => (
                <li key={item.id} className="toc-sub">
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      scrollToHeading(item.id)
                    }}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </li>
  )
}
