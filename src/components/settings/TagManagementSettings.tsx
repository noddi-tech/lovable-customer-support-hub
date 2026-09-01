import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Check, Pencil } from 'lucide-react';
import { useTags, TAG_COLORS, type Tag } from '@/hooks/useTags';
import { TagBadge } from '@/components/tags/TagBadge';
import { cn } from '@/lib/utils';

const ColorSwatches: React.FC<{ value: string; onChange: (c: string) => void }> = ({ value, onChange }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {TAG_COLORS.map((c) => (
      <button
        key={c}
        type="button"
        aria-label={`Color ${c}`}
        onClick={() => onChange(c)}
        className={cn('h-5 w-5 rounded-full border', value === c && 'ring-2 ring-ring ring-offset-1')}
        style={{ backgroundColor: c }}
      />
    ))}
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Custom color"
      className="h-6 w-8 cursor-pointer rounded border bg-background p-0.5"
    />
  </div>
);

/** Create, rename, recolor and delete the organization's custom tags. */
export const TagManagementSettings: React.FC = () => {
  const { tags, createTag, updateTag, deleteTag } = useTags();
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLORS[0]);
  const [editing, setEditing] = useState<Tag | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createTag.mutateAsync({ name, color });
    setName('');
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Tags</CardTitle>
        <CardDescription>
          Custom labels you can apply to conversations, live chats, calls, cases and customers — and
          filter on in every list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="New tag name"
              className="h-9"
            />
            <Button onClick={handleCreate} disabled={!name.trim() || createTag.isPending} className="h-9">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
          <ColorSwatches value={color} onChange={setColor} />
        </div>

        <div className="space-y-2">
          {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2 rounded-md border p-2">
              {editing?.id === tag.id ? (
                <>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="h-8 max-w-[12rem]"
                  />
                  <ColorSwatches value={editing.color} onChange={(c) => setEditing({ ...editing, color: c })} />
                  <Button
                    size="sm"
                    className="ml-auto h-8"
                    onClick={async () => {
                      await updateTag.mutateAsync({ id: tag.id, name: editing.name, color: editing.color });
                      setEditing(null);
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <TagBadge tag={tag} />
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditing(tag)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive"
                      onClick={() => deleteTag.mutate(tag.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
