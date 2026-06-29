import { extractPostImages } from './postImages'
import { getYoutubeEmbedUrl } from './postVideos'
import { getPreviewText } from './blog'

export type PostType = 'article' | 'image' | 'quote' | 'short'

export interface PostDisplay {
  type: PostType
  typeLabel: string
  previewText: string
  plainText: string
  wordCount: number
  quoteText: string
  primaryImage: string
  images: string[]
  videoEmbedUrl: string
}

const TYPE_LABELS: Record<PostType, string> = {
  article: 'Essay',
  image: 'Image',
  quote: 'Quote',
  short: 'Note'
}

interface PostLike {
  content: string
  excerpt?: string
  featuredImage?: string
  images?: string[]
  featuredVideo?: string
  videos?: string[]
  [key: string]: unknown
}

function stripToPlain(content: string): string {
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[:]{2,3}youtube\s*\{[^}]*\}\s*[:]{0,3}/gi, ' ')
    .replace(/[#*`>_~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractQuoteText(content: string): string {
  const trimmed = content.trim()
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return ''

  const quoteLines = lines.filter(l => l.startsWith('>'))
  if (quoteLines.length / lines.length >= 0.5) {
    return quoteLines
      .map(l => l.replace(/^>\s?/, '').trim())
      .join(' ')
      .trim()
  }

  const html = trimmed.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i)
  if (html?.[1]) return stripToPlain(html[1])

  return ''
}

function extractVideoEmbedUrl(post: PostLike): string {
  const videoUrl = post.featuredVideo || post.videos?.[0] || ''
  if (videoUrl) return getYoutubeEmbedUrl(videoUrl)

  if (post.content) {
    const attrMatch = post.content.match(/[:]{2,3}youtube\s*\{?\s*src="([^"]+)"/i)
    if (attrMatch?.[1]) return getYoutubeEmbedUrl(attrMatch[1])

    const linkMatch = post.content.match(/(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s"'\)\}\[\]\.,!]+)/i)
    if (linkMatch?.[1]) return getYoutubeEmbedUrl(linkMatch[1])
  }

  return ''
}

export function getPostDisplay(post: PostLike): PostDisplay {
  const content = post.content || ''
  const plainText = stripToPlain(content)
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0
  const quoteText = extractQuoteText(content)

  const contentImages = extractPostImages(content)
  const images = [...new Set([...(post.images || []), ...contentImages])]
  const primaryImage = post.featuredImage || post.images?.[0] || contentImages[0] || ''

  let type: PostType
  if (quoteText) type = 'quote'
  else if (primaryImage && wordCount < 60) type = 'image'
  else if (!primaryImage && wordCount < 40) type = 'short'
  else type = 'article'

  return {
    type,
    typeLabel: TYPE_LABELS[type],
    previewText: post.excerpt?.trim() || getPreviewText(content),
    plainText,
    wordCount,
    quoteText,
    primaryImage,
    images,
    videoEmbedUrl: extractVideoEmbedUrl(post)
  }
}
