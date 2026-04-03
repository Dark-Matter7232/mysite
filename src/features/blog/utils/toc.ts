export type TocItem = {
  id: string
  text: string
  level: 2 | 3
}

export type TocGroupData = {
  heading: TocItem
  children: TocItem[]
}

export function groupTocItems(items: TocItem[]): TocGroupData[] {
  const groups: TocGroupData[] = []

  for (const item of items) {
    if (item.level === 2 || groups.length === 0) {
      groups.push({
        heading: item,
        children: [],
      })
      continue
    }

    groups.at(-1)?.children.push(item)
  }

  return groups
}