export const siteThemes = [
  {
    value: 'atelier',
    label: 'Atelier'
  },
  {
    value: 'editorial',
    label: 'Editorial'
  }
] as const

export type SiteTheme = typeof siteThemes[number]['value']

export const DEFAULT_SITE_THEME: SiteTheme = 'editorial'

export function isSiteTheme(value: unknown): value is SiteTheme {
  return siteThemes.some(theme => theme.value === value)
}
