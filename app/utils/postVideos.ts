const youtubeBlockPattern = /:::+youtube\s*\{([^}]*)\}\s*:::/gi
const youtubeIframePattern = /<iframe\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi
const youtubeUrlPattern = /https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s"'<>)}\]]+/gi

export function getYoutubeVideoId(url: string): string {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^www\./, '')

    if (hostname === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || ''
    }

    if (hostname.endsWith('youtube.com') || hostname.endsWith('youtube-nocookie.com')) {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || ''

      const [type, id] = parsed.pathname.split('/').filter(Boolean)
      if (['embed', 'shorts', 'live'].includes(type || '')) return id || ''
    }
  } catch {
    return ''
  }

  return ''
}

export function getYoutubeThumbnail(url: string): string {
  const videoId = getYoutubeVideoId(url)
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''
}

export function getYoutubeEmbedUrl(url: string): string {
  const videoId = getYoutubeVideoId(url)
  return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
}

export function extractPostVideos(content: string): string[] {
  const matches: Array<{ index: number, url: string }> = []

  for (const match of content.matchAll(youtubeBlockPattern)) {
    const src = match[1]?.match(/\bsrc=(?:"([^"]+)"|'([^']+)'|([^\s}]+))/i)
    const url = src?.[1] || src?.[2] || src?.[3]
    if (url) matches.push({ index: match.index, url })
  }

  for (const match of content.matchAll(youtubeIframePattern)) {
    const url = match[1] || match[2] || match[3]
    if (url && getYoutubeVideoId(url)) matches.push({ index: match.index, url })
  }

  for (const match of content.matchAll(youtubeUrlPattern)) {
    if (getYoutubeVideoId(match[0])) matches.push({ index: match.index, url: match[0] })
  }

  matches.sort((a, b) => a.index - b.index)

  return [...new Set(matches.map(match => match.url))]
}
