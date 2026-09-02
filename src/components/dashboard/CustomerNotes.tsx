import { Calendar, Edit2, Plus, Trash2 } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MentionRenderer } from "@/components/ui/mention-renderer"
import { MentionTextarea } from "@/components/ui/mention-textarea"
import { useCustomerNoteMutations, useCustomerNotes } from "@/hooks/useCustomerRecord"
import { useMentionNotifications } from "@/hooks/useMentionNotifications"

interface CustomerNote {
  id: string
  content: string
  created_at: string
  created_by: string
  updated_at?: string
  source?: "local" | "noddi"
}

interface CustomerNotesProps {
  customerId?: string
}

export const CustomerNotes: React.FC<CustomerNotesProps> = ({ customerId }) => {
  const { t } = useTranslation()
  const { processMentions } = useMentionNotifications()
  const { data: dbNotes = [], isNoddiLinked } = useCustomerNotes(customerId)
  const { addNote, updateNote, deleteNote } = useCustomerNoteMutations(customerId)
  const notes: CustomerNote[] = dbNotes.map((n) => ({
    id: n.id,
    content: n.content,
    created_at: n.created_at,
    created_by: n.author?.full_name ?? "Unknown",
    updated_at: n.updated_at !== n.created_at ? n.updated_at : undefined,
    source: n.source,
  }))
  const [isAdding, setIsAdding] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState("")
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  const handleAddNote = async () => {
    if (!noteContent.trim()) return

    // Process mentions
    if (mentionedUserIds.length > 0 && customerId) {
      await processMentions(noteContent, mentionedUserIds, {
        type: "customer_note",
        customer_id: customerId,
      })
    }

    await addNote.mutateAsync({ content: noteContent.trim() })
    setNoteContent("")
    setMentionedUserIds([])
    setIsAdding(false)
  }

  const handleEditNote = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId)
    if (note) {
      setNoteContent(note.content)
      setEditingNoteId(noteId)
    }
  }

  const handleSaveEdit = async () => {
    if (!noteContent.trim() || !editingNoteId) return
    await updateNote.mutateAsync({ id: editingNoteId, content: noteContent.trim() })
    setNoteContent("")
    setEditingNoteId(null)
    toast.success("Note updated successfully")
  }

  const handleDeleteClick = (noteId: string) => {
    setNoteToDelete(noteId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    setDeleteDialogOpen(false)
    const idToDelete = noteToDelete
    setNoteToDelete(null)
    if (idToDelete) {
      // Defer row removal until after Radix finishes the dialog close animation.
      // Unmounting the trigger row synchronously with the close leaves body
      // pointer-events:none and freezes the page until refresh.
      setTimeout(() => {
        deleteNote.mutate(idToDelete)
      }, 0)
    }
  }

  const handleCancel = () => {
    setNoteContent("")
    setMentionedUserIds([])
    setIsAdding(false)
    setEditingNoteId(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{t("conversation.customerNotes")}</h3>
            {isNoddiLinked && (
              <Badge variant="outline" className="text-[10px]">
                Synced with Noddi
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            disabled={isAdding || editingNoteId !== null}
            className="w-full h-8 text-xs"
          >
            <Plus className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{t("conversation.addNote")}</span>
          </Button>
        </div>

        {/* Add new note form */}
        {isAdding && (
          <div className="space-y-2 p-2 border border-border rounded-md bg-muted/50">
            <MentionTextarea
              placeholder={`${t("conversation.enterCustomerNote")} (Type @ to mention)`}
              value={noteContent}
              onChange={(value, mentions) => {
                setNoteContent(value)
                setMentionedUserIds(mentions)
              }}
              mentionedUserIds={mentionedUserIds}
              className="min-h-[60px]"
            />
            <div className="flex items-center justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" onClick={handleAddNote} disabled={!noteContent.trim()}>
                {t("conversation.addNote")}
              </Button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {notes.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-3">
            {t("conversation.noNotesYet")}
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group p-2 border border-border rounded-md hover:bg-muted/50 transition-colors"
              >
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <MentionTextarea
                      value={noteContent}
                      onChange={(value, mentions) => {
                        setNoteContent(value)
                        setMentionedUserIds(mentions)
                      }}
                      mentionedUserIds={mentionedUserIds}
                      className="min-h-[60px]"
                    />
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={handleCancel}>
                        {t("common.cancel")}
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit} disabled={!noteContent.trim()}>
                        {t("conversation.save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <MentionRenderer
                        content={note.content}
                        className="text-sm text-foreground flex-1 min-w-0"
                      />
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
                      <span className="flex items-center gap-1">
                        <span>by {note.created_by}</span>
                        {note.source === "noddi" && (
                          <Badge variant="outline" className="h-4 px-1 text-[9px]">
                            Noddi
                          </Badge>
                        )}
                      </span>
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
            <AlertDialogTitle>{t("conversation.deleteNote")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("conversation.deleteNoteConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("conversation.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
