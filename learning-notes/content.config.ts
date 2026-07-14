import { defineContentConfig, defineCollection } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    notes: defineCollection({
      type: 'page',
      source: 'notes/**',
    }),
    nuxt: defineCollection({
      type: 'page',
      source: 'nuxt/**',
    }),
    nitro: defineCollection({
      type: 'page',
      source: 'nitro/**',
    }),
  },
})
