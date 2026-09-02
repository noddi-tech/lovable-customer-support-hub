import { useMemo } from "react"
import type { NormalizedMessage } from "@/lib/normalizeMessage"
import { buildThreadTree } from "@/lib/threadTree"
import type { ThreadNode } from "@/types/threading"

export function useThreadTree(messages: NormalizedMessage[]): ThreadNode[] {
  return useMemo(() => {
    return buildThreadTree(messages)
  }, [messages])
}
