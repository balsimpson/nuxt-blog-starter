export const getPreviewText = (content?: string) => {
  if (!content) return ''
  const plainText = content
    .replace(/<[^>]+>/g, '') // Strip HTML
    .replace(/!\[.*?\]\(.*?\)/g, '') // Strip images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Keep link text, strip URL
    .replace(/[:]{2,3}youtube\s*\{[^}]*\}\s*[:]{0,3}/gi, '') // Strip YouTube embeds
    .replace(/[#*`>_~]/g, '') // Strip common markdown symbols
    .trim()

  const lines = plainText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0)
  return lines.slice(0, 3).join(' ')
}
