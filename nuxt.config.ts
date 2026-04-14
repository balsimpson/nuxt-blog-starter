// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@clerk/nuxt',
    'convex-nuxt'
  ],

  convex: {
    url: process.env.CONVEX_URL,
    manualInit: false,
    server: false
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

})
