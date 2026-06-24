import { watch } from 'vue'
import {
  DEFAULT_SITE_THEME,
  isSiteTheme,
  siteThemes,
  type SiteTheme
} from '~/config/siteThemes'

const SITE_THEME_COOKIE = 'site-theme'
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

export function useSiteTheme() {
  const storedTheme = useCookie<string>(SITE_THEME_COOKIE, {
    default: () => DEFAULT_SITE_THEME,
    maxAge: ONE_YEAR_IN_SECONDS,
    sameSite: 'lax'
  })

  const theme = useState<SiteTheme>(SITE_THEME_COOKIE, () => (
    isSiteTheme(storedTheme.value) ? storedTheme.value : DEFAULT_SITE_THEME
  ))

  storedTheme.value = theme.value

  watch(theme, (value) => {
    storedTheme.value = value
  })

  useHead(() => ({
    htmlAttrs: {
      'data-theme': theme.value
    }
  }))

  function setTheme(value: SiteTheme) {
    theme.value = value
  }

  return {
    theme,
    themes: siteThemes,
    setTheme
  }
}
