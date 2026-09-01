import { useEffect, useMemo, useState } from 'react';
import { cleanEmailHtml, cleanPlainTextBody, isLibCleanEnabled, type CleanResult } from '@/lib/emailClean';

/**
 * Return the "visible turn" of an email body — quotes, signatures and legal
 * footers removed — with the original always kept for a "show original" toggle.
 *
 * Plain text is cleaned synchronously; HTML goes through @u22n/mailtools, which
 * is async, so the original renders until the cleaned version resolves.
 */
export function useCleanedEmailBody(content: string, isHTML: boolean): CleanResult {
  const enabled = isLibCleanEnabled();

  const passthrough = useMemo<CleanResult>(
    () => ({ visible: content, removed: '', confidence: 'high', cleaned: false }),
    [content]
  );

  const syncResult = useMemo<CleanResult>(() => {
    if (!enabled || isHTML) return passthrough;
    return cleanPlainTextBody(content);
  }, [enabled, isHTML, content, passthrough]);

  const [htmlResult, setHtmlResult] = useState<CleanResult>(passthrough);

  useEffect(() => {
    if (!enabled || !isHTML) {
      setHtmlResult(passthrough);
      return;
    }
    let cancelled = false;
    setHtmlResult(passthrough);
    cleanEmailHtml(content)
      .then((result) => {
        if (!cancelled) setHtmlResult(result);
      })
      .catch(() => {
        if (!cancelled) setHtmlResult(passthrough);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, isHTML, content, passthrough]);

  return isHTML ? htmlResult : syncResult;
}
