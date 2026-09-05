import type { CommerceModelCaller, CommerceModelResponse } from "./commerce-agent";

/** A fresh caller owns only one request's tool loop; no cross-user conversation state. */
export function createOpenAICommerceCaller(apiKey: string, model: string): CommerceModelCaller {
  const input: unknown[] = [];
  let consumedMessages = 0;

  return async (request) => {
    for (const message of request.messages.slice(consumedMessages)) {
      if (typeof message.content === "string") {
        input.push({ role: message.role, content: message.content });
      } else if (message.role === "user" && Array.isArray(message.content)) {
        for (const result of message.content) {
          input.push({
            type: "function_call_output",
            call_id: result.tool_use_id,
            output: result.content,
          });
        }
      }
      // Assistant tool blocks are already preserved in the raw Responses output below.
    }
    consumedMessages = request.messages.length;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        instructions: request.system,
        input,
        tools: request.tools.map((tool) => ({
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: { ...tool.input_schema, required: Object.keys(tool.input_schema.properties) },
          strict: true,
        })),
        tool_choice: "required",
        parallel_tool_calls: false,
        reasoning: { effort: "none" },
        max_output_tokens: 1200,
        store: false,
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`OpenAI commerce model returned ${response.status}`);
    const body = await response.json();
    if (body?.status !== "completed" || !Array.isArray(body.output)) {
      throw new Error("OpenAI commerce response was not complete");
    }

    const content: CommerceModelResponse["content"] = [];
    for (const item of body.output) {
      if (item?.type !== "function_call") continue;
      if (typeof item.call_id !== "string" || !item.call_id || typeof item.name !== "string"
        || typeof item.arguments !== "string") {
        throw new Error("Invalid OpenAI commerce tool call");
      }
      const args: unknown = JSON.parse(item.arguments);
      if (!args || typeof args !== "object" || Array.isArray(args)) {
        throw new Error("Invalid OpenAI commerce tool arguments");
      }
      content.push({ type: "tool_use", id: item.call_id, name: item.name, input: args as Record<string, unknown> });
    }
    input.push(...body.output);
    return { content, mode: "openai" };
  };
}
