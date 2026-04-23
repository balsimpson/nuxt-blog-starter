import { z } from 'zod'

export const researchSourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  reason: z.string().min(1)
})

export const clarificationQuestionSchema = z.object({
  question: z.string().min(12).max(240)
})

export const briefNormalizationSchema = z.object({
  audienceAndOutcome: z.string().min(20),
  toneAndConstraints: z.string().min(20)
})

export const researchResultSchema = z.object({
  searchQueries: z.array(z.string().min(1)).min(3).max(6),
  researchSummary: z.string().min(120),
  gaps: z.array(z.string().min(1)).min(3).max(8),
  sources: z.array(researchSourceSchema).min(3).max(6)
})

export const outlineResultSchema = z.object({
  outline: z.array(z.string().min(1)).min(5).max(9)
})

export const draftResultSchema = z.object({
  title: z.string().min(12).max(120),
  excerpt: z.string().min(80).max(260),
  markdown: z.string().min(300),
  reviewNotes: z.array(z.string().min(1)).min(3).max(6)
})

export type ResearchResult = z.infer<typeof researchResultSchema>
export type OutlineResult = z.infer<typeof outlineResultSchema>
export type DraftResult = z.infer<typeof draftResultSchema>
export type BriefNormalization = z.infer<typeof briefNormalizationSchema>
