const markdownImagePattern = /!\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\)/g
const htmlImagePattern = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi

export function extractPostImages(content: string): string[] {
  const matches: Array<{ index: number, url: string }> = []

  for (const match of content.matchAll(markdownImagePattern)) {
    const url = match[1] || match[2]
    if (url) matches.push({ index: match.index, url })
  }

  for (const match of content.matchAll(htmlImagePattern)) {
    const url = match[1] || match[2] || match[3]
    if (url) matches.push({ index: match.index, url })
  }

  matches.sort((a, b) => a.index - b.index)

  return [...new Set(matches.map(match => match.url))]
}
