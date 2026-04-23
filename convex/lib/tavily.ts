"use node"

import { action } from '../_generated/server'

type TavilyTopic = 'general' | 'news'

type TavilyResult = {
  title?: string
  url?: string
  content?: string
  score?: number
  published_date?: string
}

type TavilyResponse = {
  query?: string
  results?: TavilyResult[]
}

export type TavilySearchResult = {
  query: string
  results: Array<{
    title: string
    url: string
    snippet: string
    score?: number
    publishedDate?: string
  }>
}

export type TavilySearchArgs = {
  query: string
  topic?: TavilyTopic
  includeDomains?: string[]
}

function getTavilyApiKey() {
  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) {
    throw new Error('Missing TAVILY_API_KEY. Add it to your Convex environment before using article generation.')
  }

  return apiKey
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function searchTavily(args: TavilySearchArgs) {
  let lastError: Error | null = null
  const requestLabel = `Tavily search for "${args.query.slice(0, 80)}"`

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: getTavilyApiKey(),
          query: args.query,
          topic: args.topic || 'general',
          search_depth: 'advanced',
          max_results: 5,
          chunks_per_source: 3,
          include_answer: false,
          include_domains: args.includeDomains
        })
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`${requestLabel} failed (${response.status}): ${body.slice(0, 500)}`)
      }

      const payload = await response.json() as TavilyResponse

      return {
        query: payload.query || args.query,
        results: (payload.results || [])
          .filter(result => result.url && result.title)
          .map(result => ({
            title: result.title!,
            url: result.url!,
            snippet: result.content || '',
            score: result.score,
            publishedDate: result.published_date
          }))
      } satisfies TavilySearchResult
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`${requestLabel} failed.`)

      if (attempt === 3) {
        break
      }

      await wait(attempt * 1000)
    }
  }

  throw lastError || new Error(`${requestLabel} failed.`)
}
