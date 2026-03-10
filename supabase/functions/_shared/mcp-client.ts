// MCP Client for Navio MCP server

const MCP_URL = Deno.env.get("MCP_URL") || "https://mcp.noddi.co/mcp";

interface McpToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

/**
 * Call a tool on the Navio MCP server via Streamable HTTP (JSON-RPC).
 * Returns the parsed text content from the first text block.
 * Throws on transport or MCP-level errors.
 */
export async function callMcpTool(name: string, args: Record<string, any>): Promise<any> {
  const resp = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`MCP HTTP ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const contentType = resp.headers.get('content-type') || '';

  // Handle SSE response (text/event-stream)
  if (contentType.includes('text/event-stream')) {
    const text = await resp.text();
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.result) {
            const result: McpToolResult = parsed.result;
            if (result.isError) throw new Error(result.content?.[0]?.text || 'MCP tool error');
            const textBlock = result.content?.find((c: any) => c.type === 'text');
            if (textBlock?.text) {
              try { return JSON.parse(textBlock.text); } catch { return textBlock.text; }
            }
            return result;
          }
          if (parsed.error) throw new Error(parsed.error.message || 'MCP error');
        } catch (e) {
          if (e instanceof Error && (e.message.startsWith('MCP') || e.message.includes('tool error'))) throw e;
        }
      }
    }
    throw new Error('MCP: no result in SSE response');
  }

  // Handle plain JSON response
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message || 'MCP error');
  const result: McpToolResult = data.result;
  if (result?.isError) throw new Error(result.content?.[0]?.text || 'MCP tool error');
  const textBlock = result?.content?.find((c: any) => c.type === 'text');
  if (textBlock?.text) {
    try { return JSON.parse(textBlock.text); } catch { return textBlock.text; }
  }
  return result || data;
}

/**
 * Call an MCP tool with fallback to the legacy booking proxy.
 */
export async function callMcpWithFallback(
  mcpToolName: string,
  mcpArgs: Record<string, any>,
  fallbackPayload: Record<string, any>,
  executeBookingProxy: (payload: Record<string, any>) => Promise<string>,
): Promise<string> {
  try {
    const result = await callMcpTool(mcpToolName, mcpArgs);
    console.log(`[MCP] ${mcpToolName} succeeded`);
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (err) {
    console.warn(`[MCP] ${mcpToolName} failed, falling back to proxy:`, (err as Error).message);
    return executeBookingProxy(fallbackPayload);
  }
}
