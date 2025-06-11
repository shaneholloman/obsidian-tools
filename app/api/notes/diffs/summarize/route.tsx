import { NextRequest } from 'next/server'

import { getDiffSummarizationPrompt } from '@/prompts/notes/note-summary-user'
import { RouteMessageMap } from '@/types/upstash'
import { redis } from '@/utils/redis'
import { verifyUpstashSignature } from '@/utils/upstash'
import { anthropic } from '@/utils/ai'

export async function POST(req: NextRequest) {
  console.log('/api/notes/diffs/summarize')

  const body: RouteMessageMap['/api/notes/diffs/summarize'] =
    await verifyUpstashSignature(req)
  const response = await anthropic.messages.create({
    max_tokens: 1000,
    model: 'claude-sonnet-4-20250514',

    messages: [
      { role: 'user', content: getDiffSummarizationPrompt(body.diff.diff) },
    ],
  })
  if (!response.content) {
    return new Response('No content found in response', { status: 500 })
  }
  const responseContent = response.choices[0].message.content
  await redis.hset(body.keys.notesKey, {
    [body.diff.filename]: responseContent.trim(),
  })
  await redis.expire(body.keys.notesKey, 86400) // Set TTL for 24 hours
  return new Response('ok', { status: 200 })
}
