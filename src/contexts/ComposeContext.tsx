import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface ComposeDraft {
  id: string;
  /** Open windows are rendered in the dock; closed ones live in the drafts list. */
  open: boolean;
  minimized: boolean;
  bulkMode: boolean;
  to: string;
  toName: string;
  bulkEmails: string;
  subject: string;
  body: string;
  inboxId: string;
  priority: string;
  updatedAt: number;
}

const STORAGE_KEY = 'support-hub.compose-drafts.v1';
const MAX_OPEN_WINDOWS = 3;

function newDraft(partial?: Partial<ComposeDraft>): ComposeDraft {
  return {
    id: crypto.randomUUID(),
    open: true,
    minimized: false,
    bulkMode: false,
    to: '',
    toName: '',
    bulkEmails: '',
    subject: '',
    body: '',
    inboxId: '',
    priority: 'normal',
    updatedAt: Date.now(),
    ...partial,
  };
}

export function isDraftEmpty(d: ComposeDraft): boolean {
  return (
    !d.to.trim() &&
    !d.toName.trim() &&
    !d.bulkEmails.trim() &&
    !d.subject.trim() &&
    !d.body.trim()
  );
}

function loadDrafts(): ComposeDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((d) => d && typeof d.id === 'string').map((d) => ({ ...newDraft(), ...d }));
  } catch {
    return [];
  }
}

interface ComposeContextValue {
  drafts: ComposeDraft[];
  openWindows: ComposeDraft[];
  savedDrafts: ComposeDraft[];
  openCompose: (initial?: Partial<ComposeDraft>) => string;
  reopenDraft: (id: string) => void;
  updateDraft: (id: string, patch: Partial<ComposeDraft>) => void;
  /** Close the window — keeps it in the drafts list unless it's empty. */
  closeWindow: (id: string) => void;
  /** Remove permanently (sent or discarded). */
  removeDraft: (id: string) => void;
  toggleMinimize: (id: string) => void;
}

const ComposeContext = createContext<ComposeContextValue | null>(null);

export const ComposeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drafts, setDrafts] = useState<ComposeDraft[]>(() => loadDrafts());

  // Persist on every change so nothing is lost on reload/crash.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      /* quota — ignore */
    }
  }, [drafts]);

  const openCompose = useCallback((initial?: Partial<ComposeDraft>) => {
    const draft = newDraft(initial);
    setDrafts((prev) => {
      // Keep the dock from overflowing: minimize the oldest open windows.
      const open = prev.filter((d) => d.open);
      let next = prev;
      if (open.length >= MAX_OPEN_WINDOWS) {
        const toMinimize = open.slice(0, open.length - MAX_OPEN_WINDOWS + 1).map((d) => d.id);
        next = prev.map((d) => (toMinimize.includes(d.id) ? { ...d, minimized: true } : d));
      }
      return [...next, draft];
    });
    return draft.id;
  }, []);

  const reopenDraft = useCallback((id: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, open: true, minimized: false } : d)),
    );
  }, []);

  const updateDraft = useCallback((id: string, patch: Partial<ComposeDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d)),
    );
  }, []);

  const closeWindow = useCallback((id: string) => {
    setDrafts((prev) =>
      prev.flatMap((d) => {
        if (d.id !== id) return [d];
        if (isDraftEmpty(d)) return [];
        return [{ ...d, open: false, minimized: false }];
      }),
    );
  }, []);

  const removeDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const toggleMinimize = useCallback((id: string) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, minimized: !d.minimized } : d)));
  }, []);

  const value = useMemo<ComposeContextValue>(() => {
    const openWindows = drafts.filter((d) => d.open);
    const savedDrafts = drafts
      .filter((d) => !d.open)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return {
      drafts,
      openWindows,
      savedDrafts,
      openCompose,
      reopenDraft,
      updateDraft,
      closeWindow,
      removeDraft,
      toggleMinimize,
    };
  }, [drafts, openCompose, reopenDraft, updateDraft, closeWindow, removeDraft, toggleMinimize]);

  return <ComposeContext.Provider value={value}>{children}</ComposeContext.Provider>;
};

export function useCompose(): ComposeContextValue {
  const ctx = useContext(ComposeContext);
  if (!ctx) throw new Error('useCompose must be used within a ComposeProvider');
  return ctx;
}
