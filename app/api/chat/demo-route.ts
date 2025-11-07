/**
 * Example Chat API Route with System Prompt
 * This demonstrates how to use the searchOrganizations tool with
 * the system prompt that ensures ALL organizations are hyperlinks
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_SYSTEM_PROMPT } from '@/lib/claude-system-prompt'
import searchOrganizationsTool from '@/tools/searchOrganizations.json'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    // Call Claude with system prompt + searchOrganizations tool
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: CLAUDE_SYSTEM_PROMPT, // ← CRITICAL: Ensures hyperlinks
      tools: [searchOrganizationsTool],
      messages: messages,
    })

    // Handle tool use
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )

      for (const toolUse of toolUseBlocks) {
        if (toolUse.name === 'searchOrganizations') {
          // Call your search API
          const searchParams = new URLSearchParams(toolUse.input as Record<string, string>)
          const apiUrl = '/api/search-organizations'
          const result = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${apiUrl}?${searchParams}`)
          const data = await result.json()

          // Send result back to Claude
          const conversationHistory = [
            ...messages,
            {
              role: 'assistant' as const,
              content: response.content,
            },
            {
              role: 'user' as const,
              content: [
                {
                  type: 'tool_result' as const,
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(data),
                },
              ],
            },
          ]

          // Get final response with hyperlinks
          const finalResponse = await client.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            system: CLAUDE_SYSTEM_PROMPT, // ← Still needed for final response
            tools: [searchOrganizationsTool],
            messages: conversationHistory,
          })

          return NextResponse.json(finalResponse)
        }
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Example client-side usage:
 *
 * const response = await fetch('/api/chat', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     messages: [
 *       {
 *         role: 'user',
 *         content: 'Find sports organizations in Bergen'
 *       }
 *     ]
 *   })
 * })
 *
 * const data = await response.json()
 * // data.content will contain hyperlinked organizations!
 */
