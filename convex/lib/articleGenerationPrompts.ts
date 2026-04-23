import type { DraftResult, OutlineResult, ResearchResult } from './articleGenerationSchemas'
import type { TavilySearchResult } from './tavily'

export const INITIAL_CLARIFICATION_STATUS = 'Reviewing the brief and deciding the single most useful follow-up question.'

export type GenerationBrief = {
  requestedArticle: string
  audienceAndOutcome: string
  toneAndConstraints: string
}

export function buildClarificationQuestionPrompt(requestedArticle: string) {
  return [
    'You are preparing to write an article.',
    '',
    `Requested article: ${requestedArticle}`,
    '',
    'Ask exactly one concise follow-up question that will most improve the final article.',
    'Prefer a question that helps you lock in audience, tone, must-cover details, or must-avoid details.',
    'Do not ask multiple questions.',
    'Do not add preamble, explanation, or bullets.'
  ].join('\n')
}

export function buildBriefNormalizationPrompt(requestedArticle: string, clarificationAnswer: string) {
  return [
    'Normalize this article request into a writing brief.',
    '',
    `Requested article: ${requestedArticle}`,
    `Clarification answer: ${clarificationAnswer}`,
    '',
    'Return:',
    '- audienceAndOutcome: who this is for and what they should think, feel, or do after reading',
    '- toneAndConstraints: the intended tone, style, length expectations, and must-cover or avoid guidance'
  ].join('\n')
}

export function buildResearchPrompt(brief: GenerationBrief, seedSearch?: TavilySearchResult) {
  const seedBlock = seedSearch
    ? [
        '',
        'Seed search results from a fresh live web query:',
        `Query: ${seedSearch.query}`,
        ...seedSearch.results.map(result => `- ${result.title} | ${result.url} | ${result.snippet}`)
      ].join('\n')
    : ''

  return [
    'You are preparing a differentiated article research brief.',
    '',
    `Requested article: ${brief.requestedArticle}`,
    `Audience and desired outcome: ${brief.audienceAndOutcome}`,
    `Tone, length, and editorial constraints: ${brief.toneAndConstraints}`,
    seedBlock,
    '',
    'Use the search tool multiple times before you finish.',
    'Search for:',
    '- core topic context and recent developments',
    '- similar published articles or common coverage angles',
    '- overlooked questions, weak spots, stale takes, and missing details in that coverage',
    '- strong examples, facts, or source material that can make the article feel sharper',
    '',
    'Return a concise but high-signal research brief.',
    'Only include source URLs that came from the search tool.',
    'Do not fabricate facts, dates, sources, or statistics.',
    'If the requested tone is provocative, keep the voice provocative but keep the facts grounded.'
  ].join('\n')
}

export function buildOutlinePrompt(brief: GenerationBrief, research: ResearchResult) {
  return [
    'Build a creative outline for a publishable article using the research below.',
    '',
    `Requested article: ${brief.requestedArticle}`,
    `Audience and desired outcome: ${brief.audienceAndOutcome}`,
    `Tone, length, and editorial constraints: ${brief.toneAndConstraints}`,
    '',
    `Research summary:\n${research.researchSummary}`,
    '',
    `Content gaps to exploit:\n${research.gaps.map(gap => `- ${gap}`).join('\n')}`,
    '',
    'Return 5 to 9 outline items.',
    'Each outline item should be one string in this format: "Section title - what this section will do and why it is fresh".',
    'The outline should feel differentiated from generic blog content and should clearly use the discovered gaps.'
  ].join('\n')
}

export function buildDraftPrompt(brief: GenerationBrief, research: ResearchResult, outline: OutlineResult) {
  return [
    'Write the final article in markdown.',
    '',
    `Requested article: ${brief.requestedArticle}`,
    `Audience and desired outcome: ${brief.audienceAndOutcome}`,
    `Tone, length, and editorial constraints: ${brief.toneAndConstraints}`,
    '',
    `Research summary:\n${research.researchSummary}`,
    '',
    `Content gaps to exploit:\n${research.gaps.map(gap => `- ${gap}`).join('\n')}`,
    '',
    `Outline:\n${outline.outline.map(item => `- ${item}`).join('\n')}`,
    '',
    'Requirements:',
    '- Write a complete, publishable article with a strong opening hook.',
    '- Use markdown with a single H1 and clear H2 sections.',
    '- Keep factual claims anchored in the research and sources above.',
    '- Do not mention Tavily, search tools, or the writing process.',
    '- Match the requested tone exactly, even if it is journalistic, satirical, or aggressive.',
    '- If the requested tone is rage-bait or satirical, keep the rhetoric sharp without inventing facts.',
    '- End with a crisp final takeaway or call to action that fits the audience.'
  ].join('\n')
}
