import { action } from './_generated/server'
import { v } from 'convex/values'

export type LinkPreview = {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
}

export const fetchPreview = action({
  args: { url: v.string() },
  handler: async (_ctx, args): Promise<LinkPreview | null> => {
    try {
      const response = await fetch(args.url, {
        redirect: 'follow',
        headers: { Accept: 'text/html,application/xhtml+xml' }
      })
      if (!response.ok) return null

      const html = await response.text()
      const finalUrl = response.url || args.url
      let hostname = ''
      try {
        hostname = new URL(finalUrl).hostname
      } catch {
        hostname = ''
      }

      const title = readMeta(html, [
        ['property', 'og:title'],
        ['name', 'twitter:title']
      ]) || readTag(html, 'title') || undefined

      const description = readMeta(html, [
        ['property', 'og:description'],
        ['name', 'twitter:description'],
        ['name', 'description']
      ]) || undefined

      const image = readMeta(html, [
        ['property', 'og:image'],
        ['property', 'og:image:secure_url'],
        ['name', 'twitter:image'],
        ['name', 'twitter:image:src']
      ]) || undefined

      const siteName = readMeta(html, [['property', 'og:site_name']]) || hostname || undefined

      let favicon = readLinkIcon(html)
      if (!favicon && hostname) {
        favicon = `https://${hostname}/favicon.ico`
      }
      if (favicon) {
        try {
          favicon = new URL(favicon, finalUrl).href
        } catch {
          favicon = favicon
        }
      }

      return {
        url: finalUrl,
        title,
        description,
        image,
        siteName,
        favicon: favicon || undefined
      }
    } catch {
      return null
    }
  }
})

function readMeta(html: string, keys: Array<[attr: string, value: string]>): string {
  for (const [attr, value] of keys) {
    const pattern = new RegExp(
      `<meta[^>]*\\s${attr}\\s*=\\s*["']${escapeRegExp(value)}["'][^>]*>`,
      'i'
    )
    const match = html.match(pattern)
    if (!match) continue

    const contentMatch = match[0].match(/\scontent\s*=\s*["']([^"']*)["']/i)
    const content = contentMatch?.[1]?.trim()
    if (content) {
      return decodeEntities(content)
    }
  }
  return ''
}

function readTag(html: string, tag: string): string {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = html.match(pattern)
  return match ? decodeEntities(match[1]?.trim() ?? '') : ''
}

function readLinkIcon(html: string): string {
  const pattern = /<link[^>]*\srel\s*=\s*["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>/i
  const match = html.match(pattern)
  if (!match) return ''
  const hrefMatch = match[0].match(/\shref\s*=\s*["']([^"']*)["']/i)
  return hrefMatch?.[1]?.trim() ?? ''
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
}
