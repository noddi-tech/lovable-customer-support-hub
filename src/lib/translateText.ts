import { supabase } from "@/integrations/supabase/client"

export const DEFAULT_SOURCE_LANGUAGE = "auto"
export const DEFAULT_TARGET_LANGUAGE = "no"

/**
 * Normalize the translate-text edge response into a non-empty string.
 * Some invoke paths may hand back a JSON string instead of an object.
 */
export function parseTranslateResponse(data: unknown): string {
  let payload: { translatedText?: unknown } | null = null

  if (typeof data === "string") {
    try {
      payload = JSON.parse(data) as { translatedText?: unknown }
    } catch {
      throw new Error("Translation returned an unreadable result")
    }
  } else if (data && typeof data === "object") {
    payload = data
  }

  const translated =
    typeof payload?.translatedText === "string" ? payload.translatedText.trim() : ""
  if (!translated) {
    throw new Error("Translation returned an empty result")
  }
  return translated
}

export function translateErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error.trim()) return error
  return "Unknown error"
}

export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return text

  const { data, error } = await supabase.functions.invoke("translate-text", {
    body: {
      text: trimmed,
      sourceLanguage,
      targetLanguage,
    },
  })

  if (error) throw error
  return parseTranslateResponse(data)
}
