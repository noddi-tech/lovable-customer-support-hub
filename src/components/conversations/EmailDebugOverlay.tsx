import { useEffect, useState } from 'react';
import { debug } from '@/utils/debug';

// Master kill switch - set to false to completely disable debug overlay
const ENABLE_DEBUG_OVERLAY = true;

interface Diagnostics {
  container: {
    className: string;
    whiteSpace: string;
    lineHeight: string;
    marginTop: string;
    fontSize: string;
  };
  paragraphs: {
    count: number;
    firstMarginBottom: string;
    firstLineHeight: string;
    appliedClasses: string;
  };
  links: {
    count: number;
    textDecoration: string;
    color: string;
  };
  blockquotes: {
    count: number;
    borderLeft: string;
    background: string;
    margin: string;
  };
}

export const EmailDebugOverlay = ({ messageId }: { messageId: string }) => {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  
  useEffect(() => {
    if (!ENABLE_DEBUG_OVERLAY || import.meta.env.VITE_UI_PROBE !== '1') return;
    
    // Find the email content container
    const containers = [
      document.querySelector(`[data-message-id="${messageId}"] .email-render__html-content`),
      document.querySelector(`[data-message-id="${messageId}"] .email-render__plain-content`)
    ];
    
    const emailContainer = containers.find(el => el !== null) as HTMLElement | null;
    
    if (!emailContainer) {
      debug.warn(`[EmailDebug] ❌ No email container found for message ${messageId}`);
      return;
    }
    
    const computed = window.getComputedStyle(emailContainer);
    const paragraphs = emailContainer.querySelectorAll('p');
    const links = emailContainer.querySelectorAll('a');
    const blockquotes = emailContainer.querySelectorAll('blockquote');
    
    const firstP = paragraphs[0] as HTMLElement | undefined;
    const firstPComputed = firstP ? window.getComputedStyle(firstP) : null;
    
    const diagnosticData: Diagnostics = {
      container: {
        className: emailContainer.className,
        whiteSpace: computed.whiteSpace,
        lineHeight: computed.lineHeight,
        marginTop: computed.marginTop,
        fontSize: computed.fontSize,
      },
      paragraphs: {
        count: paragraphs.length,
        firstMarginBottom: firstPComputed?.marginBottom || 'N/A',
        firstLineHeight: firstPComputed?.lineHeight || 'N/A',
        appliedClasses: firstP?.className || 'none',
      },
      links: {
        count: links.length,
        textDecoration: links[0] ? window.getComputedStyle(links[0]).textDecoration : 'N/A',
        color: links[0] ? window.getComputedStyle(links[0]).color : 'N/A',
      },
      blockquotes: {
        count: blockquotes.length,
        borderLeft: blockquotes[0] ? window.getComputedStyle(blockquotes[0]).borderLeft : 'N/A',
        background: blockquotes[0] ? window.getComputedStyle(blockquotes[0]).backgroundColor : 'N/A',
        margin: blockquotes[0] ? window.getComputedStyle(blockquotes[0]).margin : 'N/A',
      },
    };
    
    setDiagnostics(diagnosticData);
    
    // Console logging with collapsible groups
    debug.group(`🐛 [EmailDebug] Message ${messageId.slice(-8)}`, undefined, true);
    debug.log('📦 Container', diagnosticData.container);
    debug.log('📝 Paragraphs', diagnosticData.paragraphs);
    debug.log('🔗 Links', diagnosticData.links);
    debug.log('💬 Blockquotes', diagnosticData.blockquotes);
    debug.groupEnd();
    
    // Visual highlighting
    emailContainer.style.outline = '3px solid lime';
    emailContainer.style.outlineOffset = '4px';
    
    paragraphs.forEach((p, i) => {
      if (i < 3) (p as HTMLElement).style.outline = '2px dashed yellow';
    });
    
    links.forEach((a, i) => {
      if (i < 2) (a as HTMLElement).style.outline = '2px dashed cyan';
    });
    
    blockquotes.forEach((bq) => {
      (bq as HTMLElement).style.outline = '2px dashed magenta';
    });
    
    // Cleanup on unmount
    return () => {
      emailContainer.style.outline = '';
      paragraphs.forEach((p) => ((p as HTMLElement).style.outline = ''));
      links.forEach((a) => ((a as HTMLElement).style.outline = ''));
      blockquotes.forEach((bq) => ((bq as HTMLElement).style.outline = ''));
    };
    
  }, [messageId]);
  
  if (!ENABLE_DEBUG_OVERLAY || import.meta.env.VITE_UI_PROBE !== '1' || !diagnostics) return null;
  
  return (
    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500 rounded-lg text-xs font-mono overflow-auto">
      <div className="font-bold text-yellow-900 dark:text-yellow-100 mb-3 text-sm">
        🐛 Email Render Diagnostics
      </div>
      
      <div className="space-y-3 text-yellow-900 dark:text-yellow-100">
        {/* Container Info */}
        <div>
          <div className="font-semibold text-xs mb-1">📦 Container</div>
          <div className="ml-3 space-y-1 text-[10px]">
            <div>Classes: <code className="bg-yellow-200/50 px-1 rounded">{diagnostics.container.className}</code></div>
            <div className="flex gap-4">
              <span>white-space: <strong>{diagnostics.container.whiteSpace}</strong></span>
              <span>line-height: <strong>{diagnostics.container.lineHeight}</strong></span>
            </div>
          </div>
        </div>
        
        {/* Paragraph Info */}
        <div>
          <div className="font-semibold text-xs mb-1">📝 Paragraphs ({diagnostics.paragraphs.count})</div>
          <div className="ml-3 space-y-1 text-[10px]">
            <div>First &lt;p&gt; margin-bottom: <strong className="text-red-700 dark:text-red-300">{diagnostics.paragraphs.firstMarginBottom}</strong></div>
            <div>First &lt;p&gt; line-height: <strong>{diagnostics.paragraphs.firstLineHeight}</strong></div>
          </div>
        </div>
        
        {/* Link Info */}
        <div>
          <div className="font-semibold text-xs mb-1">🔗 Links ({diagnostics.links.count})</div>
          <div className="ml-3 text-[10px]">
            {diagnostics.links.count > 0 ? (
              <div>text-decoration: <strong>{diagnostics.links.textDecoration}</strong></div>
            ) : (
              <span className="opacity-60">No links found</span>
            )}
          </div>
        </div>
        
        {/* Blockquote Info */}
        <div>
          <div className="font-semibold text-xs mb-1">💬 Blockquotes ({diagnostics.blockquotes.count})</div>
          <div className="ml-3 text-[10px]">
            {diagnostics.blockquotes.count > 0 ? (
              <>
                <div>border-left: <strong>{diagnostics.blockquotes.borderLeft}</strong></div>
                <div>margin: <strong>{diagnostics.blockquotes.margin}</strong></div>
              </>
            ) : (
              <span className="opacity-60">No blockquotes found</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-yellow-400 text-[9px] opacity-70">
        🟢 Lime = Container | 🟡 Yellow = Paragraphs | 🔵 Cyan = Links | 🟣 Magenta = Blockquotes
      </div>
    </div>
  );
};
