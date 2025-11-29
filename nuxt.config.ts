// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  routeRules: {
    // Disable prerendering since we need database connection at runtime
    '/': { ssr: true },
  },

  modules: ['@nuxtjs/supabase'],

  compatibilityDate: '2025-11-30',
})
