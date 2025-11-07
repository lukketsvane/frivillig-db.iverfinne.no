/**
 * Example: Using searchOrganizations custom tool with Claude Sonnet 4.5
 *
 * This file demonstrates how to register and use the searchOrganizations
 * custom tool with the Anthropic Claude API.
 *
 * IMPORTANT: When Claude returns results, it will automatically format them
 * as clickable links to https://frivillig-db.iverfinne.no/organisasjon/{slug}
 * based on the instructions in the tool schema.
 */

import Anthropic from '@anthropic-ai/sdk'
import searchOrganizationsTool from '../tools/searchOrganizations.json'
import { createClaudeResponse, formatToolResultForClaude } from '../lib/claude-formatters'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

/**
 * Example 1: Basic search query
 */
export async function example1_basicSearch() {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    tools: [searchOrganizationsTool],
    messages: [
      {
        role: 'user',
        content: 'Find youth organizations in Oslo that have websites',
      },
    ],
  })

  // Claude will likely use the tool:
  // {
  //   "name": "searchOrganizations",
  //   "input": {
  //     "query": "ungdom barn",
  //     "location": "Oslo",
  //     "only_with_website": true,
  //     "limit": 10
  //   }
  // }

  console.log('Claude response:', message)
  return message
}

/**
 * Example 2: Handle tool use and return results
 */
export async function example2_toolUseFlow() {
  const conversationHistory: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: 'Find sports organizations in Bergen with email addresses',
    },
  ]

  // Initial request
  let response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    tools: [searchOrganizationsTool],
    messages: conversationHistory,
  })

  console.log('Initial response:', response)

  // Check if Claude wants to use a tool
  if (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    )

    for (const toolUse of toolUseBlocks) {
      if (toolUse.name === 'searchOrganizations') {
        console.log('Tool called with input:', toolUse.input)

        // Call your API endpoint
        const searchParams = new URLSearchParams(
          toolUse.input as Record<string, string>
        )
        const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/search-organizations'
        // OR: const apiUrl = '/api/search-organizations'

        const result = await fetch(`${apiUrl}?${searchParams}`)
        const data = await result.json()

        console.log('API returned:', data)

        // Send tool result back to Claude with formatting instructions
        conversationHistory.push({
          role: 'assistant',
          content: response.content,
        })

        // Option 1: Send raw data (Claude will format based on tool schema)
        conversationHistory.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(data),
            },
          ],
        })

        // Option 2: Pre-format for Claude (uncomment to use)
        // const formattedResult = formatToolResultForClaude(
        //   data.data,
        //   data.meta,
        //   toolUse.input.query,
        //   toolUse.input.location
        // )
        // conversationHistory.push({
        //   role: 'user',
        //   content: [
        //     {
        //       type: 'tool_result',
        //       tool_use_id: toolUse.id,
        //       content: formattedResult,
        //     },
        //   ],
        // })

        // Get final response from Claude
        const finalResponse = await client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          tools: [searchOrganizationsTool],
          messages: conversationHistory,
        })

        console.log('Final response:', finalResponse)
        return finalResponse
      }
    }
  }

  return response
}

/**
 * Example 3: Multi-turn conversation with tool use
 */
export async function example3_multiTurnConversation() {
  const conversationHistory: Anthropic.MessageParam[] = []

  // Helper function to send message and handle tool use
  async function sendMessage(userMessage: string) {
    conversationHistory.push({
      role: 'user',
      content: userMessage,
    })

    let response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      tools: [searchOrganizationsTool],
      messages: conversationHistory,
    })

    // Handle tool use loop
    while (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type === 'tool_use' && block.name === 'searchOrganizations') {
          // Call API
          const searchParams = new URLSearchParams(
            block.input as Record<string, string>
          )
          const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/search-organizations`
          const result = await fetch(`${apiUrl}?${searchParams}`)
          const data = await result.json()

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(data),
          })
        }
      }

      // Add assistant response and tool results to history
      conversationHistory.push({
        role: 'assistant',
        content: response.content,
      })

      conversationHistory.push({
        role: 'user',
        content: toolResults,
      })

      // Get next response
      response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        tools: [searchOrganizationsTool],
        messages: conversationHistory,
      })
    }

    // Add final assistant response to history
    conversationHistory.push({
      role: 'assistant',
      content: response.content,
    })

    return response
  }

  // Multi-turn conversation
  await sendMessage('Find sports organizations in Oslo')
  await sendMessage('Which of these focus on youth activities?')
  await sendMessage('Show me the ones with websites I can visit')

  return conversationHistory
}

/**
 * Example 4: Using with streaming
 */
export async function example4_streaming() {
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    tools: [searchOrganizationsTool],
    messages: [
      {
        role: 'user',
        content: 'Find cultural organizations in Trondheim',
      },
    ],
  })

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_start') {
      console.log('Content block started:', chunk.content_block)
    }

    if (chunk.type === 'content_block_delta') {
      if (chunk.delta.type === 'text_delta') {
        process.stdout.write(chunk.delta.text)
      }
    }

    if (chunk.type === 'message_stop') {
      const message = await stream.finalMessage()
      console.log('\n\nFinal message:', message)

      // Handle tool use from final message
      if (message.stop_reason === 'tool_use') {
        // Process tool calls as in previous examples
        console.log('Tool use detected in streaming response')
      }
    }
  }
}

/**
 * Example 5: Error handling
 */
export async function example5_errorHandling() {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      tools: [searchOrganizationsTool],
      messages: [
        {
          role: 'user',
          content: 'Find organizations in Oslo',
        },
      ],
    })

    if (response.stop_reason === 'tool_use') {
      for (const block of response.content) {
        if (block.type === 'tool_use' && block.name === 'searchOrganizations') {
          try {
            const searchParams = new URLSearchParams(
              block.input as Record<string, string>
            )
            const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/search-organizations`
            const result = await fetch(`${apiUrl}?${searchParams}`)

            if (!result.ok) {
              // Return error to Claude
              const errorData = await result.json()

              const errorResponse = await client.messages.create({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 4096,
                tools: [searchOrganizationsTool],
                messages: [
                  {
                    role: 'user',
                    content: 'Find organizations in Oslo',
                  },
                  {
                    role: 'assistant',
                    content: response.content,
                  },
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'tool_result',
                        tool_use_id: block.id,
                        content: JSON.stringify({
                          error: errorData.error || 'API request failed',
                          status: result.status,
                        }),
                        is_error: true,
                      },
                    ],
                  },
                ],
              })

              console.log('Claude handled error:', errorResponse)
              return errorResponse
            }

            const data = await result.json()
            console.log('Success:', data)
          } catch (error) {
            console.error('API call failed:', error)
            // Handle network errors
            throw error
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', error.status, error.message)
    } else {
      console.error('Unexpected error:', error)
    }
    throw error
  }
}

/**
 * Example 6: Using with Next.js API route
 */
export async function example6_nextJsApiRoute() {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    tools: [searchOrganizationsTool],
    messages: [
      {
        role: 'user',
        content: 'Find volunteer organizations in Stavanger',
      },
    ],
  })

  if (response.stop_reason === 'tool_use') {
    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'searchOrganizations') {
        // Use Next.js API route instead of Edge Function
        const searchParams = new URLSearchParams(
          block.input as Record<string, string>
        )
        const apiUrl = '/api/search-organizations' // Next.js API route

        const result = await fetch(`${apiUrl}?${searchParams}`)
        const data = await result.json()

        console.log('API route returned:', data)
      }
    }
  }
}

/**
 * Example 7: Expected Claude Response Format
 * This shows what Claude should output based on the tool schema instructions
 */
export function example7_expectedOutputFormat() {
  console.log(`
=================================================================
EXAMPLE: Expected Claude Response with Clickable Links
=================================================================

User Query:
"Find sports organizations in Bergen for youth"

Claude Tool Call:
{
  "name": "searchOrganizations",
  "input": {
    "query": "idrett sport ungdom",
    "poststed": "Bergen",
    "limit": 5
  }
}

API Returns:
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "navn": "Bergen Idrettslag",
      "slug": "bergen-idrettslag",
      "aktivitet": "Fotball, håndball og ski for barn og ungdom",
      "forretningsadresse_poststed": "Bergen",
      "fylke": "Vestland",
      "hjemmeside": "https://bergen-il.no",
      "epost": "post@bergen-il.no",
      "telefon": "55123456"
    },
    ... (4 more)
  ],
  "meta": {
    "total": 23,
    "returned": 5
  }
}

Claude Response (CORRECT FORMAT):
---

Jeg fant 23 idrettsklubber i Bergen som jobber med ungdom. Her er de 5 mest relevante:

1. **[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/bergen-idrettslag)**
   Fotball, håndball og ski for barn og ungdom
   📍 Bergen, Vestland

2. **[Fana Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/fana-idrettslag)**
   Allsidig idrettsklubb med fokus på barne- og ungdomsidrett
   📍 Bergen, Vestland

3. **[Bergen Svømmeklubb](https://frivillig-db.iverfinne.no/organisasjon/bergen-svommeklubb)**
   Svømmetrening for alle aldre fra 6 år
   📍 Bergen, Vestland

4. **[Tertnes Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/tertnes-idrettslag)**
   Fotball, volleyball og turn for barn
   📍 Bergen, Vestland

5. **[Fyllingsdalen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/fyllingsdalen-idrettslag)**
   Fotball og håndball med sterkt barneprogram
   📍 Bergen, Vestland

Det er 18 flere organisasjoner. [Se alle 23 resultater →](https://frivillig-db.iverfinne.no/utforsk?query=idrett%20sport%20ungdom&location=Bergen)

Vil du vite mer om noen av disse? Klikk på navnet for å se full info, kontaktdetaljer og påmeldingsinformasjon.

---

KEY POINTS:
✅ Each organization name is a clickable markdown link
✅ Links use full URL: https://frivillig-db.iverfinne.no/organisasjon/{slug}
✅ No raw data (IDs, JSON) shown to user
✅ Emojis used for visual hierarchy
✅ "See all" link provided for pagination
✅ User-friendly Norwegian language
✅ Clean, scannable formatting

INCORRECT FORMATS TO AVOID:
❌ "Bergen Idrettslag (ID: 123e4567-e89b-12d3-a456-426614174000)"
❌ "View at: frivillig-db.iverfinne.no/organisasjon/bergen-idrettslag" (no clickable link)
❌ Raw JSON output
❌ Showing 'slug' field to users

=================================================================
  `)
}

// Run examples
if (require.main === module) {
  console.log('Running examples...\n')

  // Uncomment to run specific examples:
  // example1_basicSearch()
  // example2_toolUseFlow()
  // example3_multiTurnConversation()
  // example4_streaming()
  // example5_errorHandling()
  // example6_nextJsApiRoute()
  // example7_expectedOutputFormat() // Show expected format
}
