import { DefaultEditor, BtnBold, BtnItalic, BtnUnderline, BtnLink, BtnBulletList, BtnNumberedList, Separator, Toolbar, EditorProvider, Editor } from 'react-simple-wysiwyg';
import { cn } from '@/lib/utils';

interface SimpleRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function SimpleRichEditor({ 
  value, 
  onChange, 
  placeholder = "Enter text...",
  className,
  minHeight = "150px"
}: SimpleRichEditorProps) {
  return (
    <div className={cn("simple-rich-editor", className)}>
      <DefaultEditor
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight }}
      >
        <Toolbar>
          <BtnBold />
          <BtnItalic />
          <BtnUnderline />
          <Separator />
          <BtnLink />
          <Separator />
          <BtnBulletList />
          <BtnNumberedList />
        </Toolbar>
      </DefaultEditor>
      <style>{`
        .simple-rich-editor .rsw-editor {
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 2px);
          background: hsl(var(--background));
          overflow: hidden;
        }
        .simple-rich-editor .rsw-toolbar {
          background: hsl(var(--muted));
          border-bottom: 1px solid hsl(var(--border));
          padding: 4px 8px;
        }
        .simple-rich-editor .rsw-btn {
          background: transparent;
          border: none;
          border-radius: 4px;
          padding: 6px 8px;
          cursor: pointer;
          color: hsl(var(--foreground));
        }
        .simple-rich-editor .rsw-btn:hover {
          background: hsl(var(--accent));
        }
        .simple-rich-editor .rsw-btn[data-active="true"] {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .simple-rich-editor .rsw-separator {
          margin: 0 4px;
          border-left: 1px solid hsl(var(--border));
          height: 24px;
        }
        .simple-rich-editor .rsw-ce {
          padding: 12px;
          min-height: ${minHeight};
          outline: none;
        }
        .simple-rich-editor .rsw-ce:focus {
          outline: none;
        }
        .simple-rich-editor .rsw-ce a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .simple-rich-editor .rsw-ce ul,
        .simple-rich-editor .rsw-ce ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .simple-rich-editor .rsw-ce li {
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  );
}
