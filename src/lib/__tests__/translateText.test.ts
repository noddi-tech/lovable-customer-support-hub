import { describe, expect, it } from "vitest"
import { parseTranslateResponse, translateErrorMessage } from "@/lib/translateText"

describe("parseTranslateResponse", () => {
  it("reads translatedText from an object payload", () => {
    expect(parseTranslateResponse({ translatedText: "  Hei  " })).toBe("Hei")
  })

  it("parses a JSON string payload", () => {
    expect(parseTranslateResponse(JSON.stringify({ translatedText: "Bonjour" }))).toBe("Bonjour")
  })

  it("rejects empty or missing translated text", () => {
    expect(() => parseTranslateResponse({ translatedText: "   " })).toThrow(/empty result/)
    expect(() => parseTranslateResponse({})).toThrow(/empty result/)
    expect(() => parseTranslateResponse(null)).toThrow(/empty result/)
  })

  it("rejects unreadable string payloads", () => {
    expect(() => parseTranslateResponse("{not-json")).toThrow(/unreadable/)
  })
})

describe("translateErrorMessage", () => {
  it("prefers Error.message and falls back safely", () => {
    expect(translateErrorMessage(new Error("boom"))).toBe("boom")
    expect(translateErrorMessage("plain")).toBe("plain")
    expect(translateErrorMessage(null)).toBe("Unknown error")
  })
})
