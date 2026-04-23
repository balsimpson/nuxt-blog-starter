import { createOpenAI } from '@ai-sdk/openai'

const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini'

let provider: ReturnType<typeof createOpenAI> | null = null

function getOpenRouterApiKey() {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY. Add it to your Convex environment before using article generation.')
  }

  return apiKey
}

function getOpenRouterProvider() {
  if (!provider) {
    provider = createOpenAI({
      apiKey: getOpenRouterApiKey(),
      baseURL: 'https://openrouter.ai/api/v1',
      name: 'openrouter',
      headers: {
        'HTTP-Referer': process.env.CONVEX_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nuxt Blog Starter'
      }
    })
  }

  return provider
}

export function getArticleGenerationModel() {
  return getOpenRouterProvider().chat(process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL)
}
