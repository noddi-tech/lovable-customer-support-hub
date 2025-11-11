import { useMemo } from 'react';
import { NormalizedMessage } from "@/lib/normalizeMessage";
import { ThreadNode } from "@/types/threading";
import { buildThreadTree } from "@/lib/threadTree";

export function useThreadTree(messages: NormalizedMessage[]): ThreadNode[] {
  return useMemo(() => {
    return buildThreadTree(messages);
  }, [messages]);
}
