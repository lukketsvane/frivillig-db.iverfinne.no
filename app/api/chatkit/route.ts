import { runWorkflow, type WorkflowInput } from "@/lib/chatkit/workflow"

export const maxDuration = 30

// Ensure OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set")
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { input_as_text } = body as WorkflowInput

    if (!input_as_text) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required field: input_as_text",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    }

    console.log("[ChatKit API] Running workflow with input:", input_as_text)

    const result = await runWorkflow({ input_as_text })

    console.log("[ChatKit API] Workflow completed successfully")

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  } catch (error) {
    console.error("[ChatKit API] Error:", error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  }
}
