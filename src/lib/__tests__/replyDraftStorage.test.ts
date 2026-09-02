import { afterEach, describe, expect, it } from "vitest"
import { clearReplyDraft, loadReplyDraft, saveReplyDraft } from "@/lib/replyDraftStorage"

describe("replyDraftStorage", () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it("saves and restores typed draft text per conversation", () => {
    saveReplyDraft("conv-a", "Hei, vi kan sende deg tilbud")
    expect(loadReplyDraft("conv-a")).toBe("Hei, vi kan sende deg tilbud")
    expect(loadReplyDraft("conv-b")).toBe("")
  })

  it("clears empty drafts and explicit clears", () => {
    saveReplyDraft("conv-a", "draft")
    saveReplyDraft("conv-a", "   ")
    expect(loadReplyDraft("conv-a")).toBe("")

    saveReplyDraft("conv-a", "again")
    clearReplyDraft("conv-a")
    expect(loadReplyDraft("conv-a")).toBe("")
  })
})
