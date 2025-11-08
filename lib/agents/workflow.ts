import { Runner, AgentInputItem, withTrace } from "@openai/agents"
import { volunteerOrgAgent, type AgentOutput } from "@/lib/agents"

export type WorkflowInput = {
  input_as_text: string
  userLocation?: {
    postnummer?: string
    kommune?: string
    fylke?: string
  }
}

export type WorkflowOutput = {
  output_text: string
  output_parsed: AgentOutput
  conversationHistory: AgentInputItem[]
}

/**
 * Main workflow function that runs the volunteer organization agent
 */
export const runWorkflow = async (workflow: WorkflowInput): Promise<WorkflowOutput> => {
  return await withTrace("Volunteer Organization Workflow", async () => {
    // Prepare the input message
    let inputText = workflow.input_as_text

    // Add location context if provided
    if (workflow.userLocation) {
      const locationParts: string[] = []
      if (workflow.userLocation.kommune) locationParts.push(`Kommune: ${workflow.userLocation.kommune}`)
      if (workflow.userLocation.fylke) locationParts.push(`Fylke: ${workflow.userLocation.fylke}`)
      if (workflow.userLocation.postnummer) locationParts.push(`Postnummer: ${workflow.userLocation.postnummer}`)

      if (locationParts.length > 0) {
        inputText += `\n\n[Brukar sin lokasjon: ${locationParts.join(", ")}]`
      }
    }

    // Initialize conversation history
    const conversationHistory: AgentInputItem[] = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: inputText,
          },
        ],
      },
    ]

    // Create and run the agent
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "frivillig-db-workflow",
        workflow_id: "wf_frivillig_org_search",
      },
    })

    const result = await runner.run(volunteerOrgAgent, conversationHistory)

    // Update conversation history with new items
    conversationHistory.push(...result.newItems.map((item) => item.rawItem))

    if (!result.finalOutput) {
      throw new Error("Agent result is undefined")
    }

    // Extract text response from assistant messages
    let outputText = ""
    const assistantMessages = result.newItems.filter((item) => item.rawItem.role === "assistant")

    for (const message of assistantMessages) {
      if (message.rawItem.content) {
        for (const content of message.rawItem.content) {
          if (content.type === "output_text") {
            outputText += content.text + "\n"
          }
        }
      }
    }

    return {
      output_text: outputText.trim() || JSON.stringify(result.finalOutput),
      output_parsed: result.finalOutput,
      conversationHistory,
    }
  })
}
