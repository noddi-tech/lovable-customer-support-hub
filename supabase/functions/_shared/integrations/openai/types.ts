export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string | unknown
  name?: string
  tool_call_id?: string
  tool_calls?: unknown[]
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  max_completion_tokens?: number
  tools?: unknown[]
  tool_choice?: unknown
  response_format?: unknown
  stream?: boolean
  [key: string]: unknown
}

export interface ChatCompletionResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    finish_reason: string | null
    message: {
      role: string
      content: string | null
      tool_calls?: Array<{
        id: string
        type: string
        function: { name: string; arguments: string }
      }>
    }
  }>
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export interface EmbeddingResponse {
  data: Array<{ index: number; embedding: number[] }>
  model: string
  usage?: { prompt_tokens: number; total_tokens: number }
}
