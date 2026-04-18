// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@clerk/nuxt',
    'convex-nuxt',
    '@nuxtjs/mdc',
    'motion-v/nuxt'
  ],

  convex: {
    url: process.env.CONVEX_URL,
    manualInit: false,
    server: false
  },

  vite: {
    optimizeDeps: {
      include: [
        // Prevent duplicate ProseMirror plugin instances in Nuxt UI's editor.
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor'
      ]
    }
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // routeRules: {
  //   '/': { prerender: true }
  // },

  compatibilityDate: '2025-01-15',

  colorMode: {
    preference: 'system',
    fallback: 'light'
  }
})
