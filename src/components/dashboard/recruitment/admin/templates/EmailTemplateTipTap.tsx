import { useEffect, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { MergeFieldDropdown } from './MergeFieldDropdown';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function EmailTemplateTipTap({ value, onChange, placeholder, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      Placeholder.configure({
        placeholder:
          placeholder ||
          'Skriv e-postinnholdet her. Bruk Sett inn flettefelt-knappen til å legge inn personlig informasjon.',
      }),
    ],
    content: value || '<p></p>',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[20rem] px-4 py-3 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child]:before:text-muted-foreground [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:h-0',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className={cn('rounded-md border border-input bg-background p-4 text-xs text-muted-foreground', className)}>
        Laster editor...
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border border-input bg-background overflow-hidden', className)}>
      <Toolbar editor={editor} />
      <div className="resize-y overflow-auto min-h-[20rem]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const insertMergeField = (key: string) => {
    editor.chain().focus().insertContent(key).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-input bg-muted/40 p-1.5">
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        ariaLabel="Fet"
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        ariaLabel="Kursiv"
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        ariaLabel="Understreket"
      >
        <UnderlineIcon />
      </ToolbarButton>
      <Separator orientation="vertical" className="h-6 mx-0.5" />
      <ToolbarButton
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        ariaLabel="Overskrift 1"
      >
        <Heading1 />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        ariaLabel="Overskrift 2"
      >
        <Heading2 />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        ariaLabel="Overskrift 3"
      >
        <Heading3 />
      </ToolbarButton>
      <Separator orientation="vertical" className="h-6 mx-0.5" />
      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        ariaLabel="Punktliste"
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        ariaLabel="Nummerert liste"
      >
        <ListOrdered />
      </ToolbarButton>
      <Separator orientation="vertical" className="h-6 mx-0.5" />
      <LinkButton editor={editor} />
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        ariaLabel="Horisontal linje"
      >
        <Minus />
      </ToolbarButton>
      <Separator orientation="vertical" className="h-6 mx-0.5" />
      <div className="ml-auto">
        <MergeFieldDropdown onInsert={insertMergeField} size="xs" />
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  ariaLabel,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="xs"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="h-7 w-7 p-0"
    >
      {children}
    </Button>
  );
}

function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const apply = () => {
    if (url.trim()) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url.trim() })
        .run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setOpen(false);
    setUrl('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setUrl(editor.getAttributes('link').href ?? '');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={editor.isActive('link') ? 'secondary' : 'ghost'}
          size="xs"
          aria-label="Lenke"
          title="Lenke"
          className="h-7 w-7 p-0"
        >
          <LinkIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-2">
          <p className="text-xs font-medium">Lenke-URL</p>
          <Input
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                apply();
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-1">
            <Button type="button" size="xs" variant="ghost" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button type="button" size="xs" onClick={apply}>
              {editor.isActive('link') ? 'Oppdater' : 'Sett inn'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
