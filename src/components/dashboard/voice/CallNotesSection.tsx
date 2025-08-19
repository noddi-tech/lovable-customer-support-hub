import React, { useState } from 'react';
import { MessageSquare, Plus, Edit, Trash2, Save, X, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCallNotes, CallNote } from '@/hooks/useCallNotes';
import { formatDistanceToNow } from 'date-fns';

interface CallNotesSectionProps {
  callId: string;
}

export const CallNotesSection = ({ callId }: CallNotesSectionProps) => {
  const { t } = useTranslation();
  const { notes, isLoading, createNote, updateNote, deleteNote, isCreating, canEditNote } = useCallNotes(callId);
  
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteIsPrivate, setNewNoteIsPrivate] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editIsPrivate, setEditIsPrivate] = useState(false);

  const handleCreateNote = () => {
    if (!newNoteContent.trim()) return;
    
    createNote(
      { callId, content: newNoteContent, isPrivate: newNoteIsPrivate },
      {
        onSuccess: () => {
          setNewNoteContent('');
          setNewNoteIsPrivate(false);
          setIsAddingNote(false);
        }
      }
    );
  };

  const handleUpdateNote = (noteId: string) => {
    if (!editContent.trim()) return;
    
    updateNote(
      { noteId, content: editContent, isPrivate: editIsPrivate },
      {
        onSuccess: () => {
          setEditingNote(null);
          setEditContent('');
        }
      }
    );
  };

  const startEditing = (note: CallNote) => {
    setEditingNote(note.id);
    setEditContent(note.content);
    setEditIsPrivate(note.is_private);
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditContent('');
    setEditIsPrivate(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const checkCanEditNote = (note: CallNote) => {
    return canEditNote(note);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Call Notes
          </h3>
          <p className="text-sm text-muted-foreground">
            Add notes and comments about this call
          </p>
        </div>
        {!isAddingNote && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNote(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Note
          </Button>
        )}
      </div>

      {/* Add New Note */}
      {isAddingNote && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <Textarea
              placeholder="Add your note about this call..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="private-note"
                  checked={newNoteIsPrivate}
                  onCheckedChange={setNewNoteIsPrivate}
                />
                <Label htmlFor="private-note" className="text-sm flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Private note
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingNote(false);
                    setNewNoteContent('');
                    setNewNoteIsPrivate(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateNote}
                  disabled={!newNoteContent.trim() || isCreating}
                >
                  {isCreating ? 'Adding...' : 'Add Note'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No notes added yet</p>
            <p className="text-sm text-muted-foreground">
              Add the first note to start documenting this call
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={note.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {getInitials(note.profiles?.full_name || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">
                        {note.profiles?.full_name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </span>
                      {note.is_private && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Private
                        </Badge>
                      )}
                    </div>
                    
                    {editingNote === note.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`edit-private-${note.id}`}
                              checked={editIsPrivate}
                              onCheckedChange={setEditIsPrivate}
                            />
                            <Label htmlFor={`edit-private-${note.id}`} className="text-sm flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Private note
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateNote(note.id)}
                              disabled={!editContent.trim()}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="group">
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {note.content}
                        </p>
                        {checkCanEditNote(note) && (
                          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(note)}
                              className="h-6 px-2"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNote(note.id)}
                              className="h-6 px-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};