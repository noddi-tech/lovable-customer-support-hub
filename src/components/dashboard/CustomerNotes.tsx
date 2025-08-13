import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CustomerNote {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  updated_at?: string;
}

interface CustomerNotesProps {
  customerId?: string;
}

// Dummy data for now - will be replaced with API calls
const dummyNotes: CustomerNote[] = [
  {
    id: '1',
    content: 'Customer prefers email communication over phone calls. Very responsive to technical solutions.',
    created_at: '2025-01-15T10:30:00Z',
    created_by: 'John Doe',
    updated_at: '2025-01-15T14:20:00Z'
  },
  {
    id: '2', 
    content: 'Uses premium plan. Has requested priority support for integration issues.',
    created_at: '2025-01-10T09:15:00Z',
    created_by: 'Sarah Johnson'
  }
];

export const CustomerNotes: React.FC<CustomerNotesProps> = ({ customerId }) => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<CustomerNote[]>(dummyNotes);
  const [isAdding, setIsAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const handleAddNote = () => {
    if (!noteContent.trim()) return;

    const newNote: CustomerNote = {
      id: Date.now().toString(),
      content: noteContent.trim(),
      created_at: new Date().toISOString(),
      created_by: 'Current User', // Will be replaced with actual user
    };

    setNotes([newNote, ...notes]);
    setNoteContent('');
    setIsAdding(false);
    toast.success('Note added successfully');
  };

  const handleEditNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setNoteContent(note.content);
      setEditingNoteId(noteId);
    }
  };

  const handleSaveEdit = () => {
    if (!noteContent.trim()) return;

    setNotes(notes.map(note => 
      note.id === editingNoteId 
        ? { ...note, content: noteContent.trim(), updated_at: new Date().toISOString() }
        : note
    ));
    
    setNoteContent('');
    setEditingNoteId(null);
    toast.success('Note updated successfully');
  };

  const handleDeleteClick = (noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (noteToDelete) {
      setNotes(notes.filter(note => note.id !== noteToDelete));
      toast.success('Note deleted successfully');
    }
    setDeleteDialogOpen(false);
    setNoteToDelete(null);
  };

  const handleCancel = () => {
    setNoteContent('');
    setIsAdding(false);
    setEditingNoteId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">{t('conversation.customerNotes')}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            disabled={isAdding || editingNoteId !== null}
            className="w-full h-8 text-xs"
          >
            <Plus className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{t('conversation.addNote')}</span>
          </Button>
        </div>

        {/* Add new note form */}
        {isAdding && (
          <div className="space-y-2 p-2 border border-border rounded-md bg-muted/50">
            <Textarea
              placeholder={t('conversation.enterCustomerNote')}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="min-h-[60px] resize-none"
            />
            <div className="flex items-center justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                {t('common.cancel')}
              </Button>
              <Button 
                size="sm" 
                onClick={handleAddNote}
                disabled={!noteContent.trim()}
              >
                {t('conversation.addNote')}
              </Button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {notes.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-3">
            {t('conversation.noNotesYet')}
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div key={note.id} className="group p-2 border border-border rounded-md hover:bg-muted/50 transition-colors">
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="min-h-[60px] resize-none"
                    />
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={handleCancel}>
                        {t('common.cancel')}
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSaveEdit}
                        disabled={!noteContent.trim()}
                      >
                        {t('conversation.save')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-foreground flex-1 min-w-0">{note.content}</p>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditNote(note.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(note.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                      <span>by {note.created_by}</span>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(note.updated_at || note.created_at)}</span>
                        {note.updated_at && <span>(edited)</span>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('conversation.deleteNote')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('conversation.deleteNoteConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('conversation.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};