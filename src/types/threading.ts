import { NormalizedMessage } from "@/lib/normalizeMessage";

export interface ThreadNode {
  message: NormalizedMessage;
  children: ThreadNode[];
  depth: number;
  parentId?: string;
  isLastInBranch: boolean;
  hasChildren: boolean;
}

export type ThreadViewMode = 'threaded' | 'chronological';

export interface ThreadState {
  viewMode: ThreadViewMode;
  collapsedThreads: Set<string>;
  expandedThreads: Set<string>;
}
