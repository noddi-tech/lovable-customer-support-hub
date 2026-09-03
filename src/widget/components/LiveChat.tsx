import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  endChat,
  markChatSessionSeen,
  sendChatAttachment,
  sendChatMessage,
  updateTypingStatus,
} from "../api"
import { useWidgetPolling } from "../hooks/useWidgetPolling"
import { getWidgetTranslations } from "../translations"
import type { ChatSession } from "../types"
import { ChatRating } from "./ChatRating"

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || "")
      resolve(result.slice(result.indexOf(",") + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

interface LiveChatProps {
  session: ChatSession
  primaryColor: string
  visitorName?: string
  onEnd: () => void
  onBack: () => void
  language: string
}

export const LiveChat: React.FC<LiveChatProps> = ({
  session,
  primaryColor,
  visitorName,
  onEnd,
  onBack,
  language,
}) => {
  const [inputValue, setInputValue] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [endedLocally, setEndedLocally] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<number | null>(null)
  const lastTypingRef = useRef(false)

  const t = getWidgetTranslations(language)

  const { messages, agentTyping, sessionStatus, assignedAgentName, isConnected, refetch } =
    useWidgetPolling(session.id)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // The panel is open, so anything visible here counts as read.
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last) markChatSessionSeen(last.createdAt)
  }, [messages])

  // Handle typing indicator
  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (isTyping !== lastTypingRef.current) {
        lastTypingRef.current = isTyping
        updateTypingStatus(session.id, isTyping)
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current)
      }

      // Set timeout to clear typing after 3 seconds of no activity
      if (isTyping) {
        typingTimeoutRef.current = window.setTimeout(() => {
          lastTypingRef.current = false
          updateTypingStatus(session.id, false)
        }, 3000)
      }
    },
    [session.id],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (e.target.value.length > 0) {
      handleTyping(true)
    }
  }

  const handleSend = async () => {
    const content = inputValue.trim()
    if (!content || isSending) return

    setIsSending(true)
    setInputValue("")
    handleTyping(false)

    const result = await sendChatMessage(session.id, content, language)

    if (result) {
      // Immediately refetch to show the new message
      refetch()
    }

    setIsSending(false)
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setUploadError(null)
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setUploadError(t.attachmentTypeError)
      return
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setUploadError(t.attachmentSizeError)
      return
    }

    setIsUploading(true)
    const data = await fileToBase64(file).catch(() => null)
    if (!data) {
      setIsUploading(false)
      setUploadError(t.attachmentUploadError)
      return
    }
    const result = await sendChatAttachment(session.id, {
      filename: file.name,
      mimeType: file.type,
      data,
    })
    setIsUploading(false)
    if (!result.success) {
      setUploadError(result.error || t.attachmentUploadError)
      return
    }
    refetch()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Ending the chat keeps the visitor in the chat view so the post-chat
  // prompt (problem solved? + rating) can be answered before leaving.
  const handleEndChat = async () => {
    await endChat(session.id, false)
    setEndedLocally(true)
  }

  // Visitor confirms the issue is solved — closes the conversation for agents too.
  const handleResolveChat = async () => {
    await endChat(session.id, true)
    setEndedLocally(true)
  }

  const isEnded = endedLocally || sessionStatus === "ended" || sessionStatus === "abandoned"

  return (
    <div className="noddi-widget-chat">
      {/* Back button */}
      <button type="button" className="noddi-widget-back" onClick={onBack}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        {t.back}
      </button>

      {/* Status bar */}
      <div className="noddi-chat-status">
        <div className="noddi-chat-status-indicator">
          <span
            className="noddi-chat-status-dot"
            style={{
              backgroundColor: isConnected
                ? sessionStatus === "active"
                  ? "#22c55e"
                  : "#f59e0b"
                : "#ef4444",
            }}
          />
          <span className="noddi-chat-status-text">
            {isEnded
              ? t.chatEnded
              : sessionStatus === "waiting"
                ? t.waitingForAgent
                : assignedAgentName
                  ? `${t.chattingWith} ${assignedAgentName}`
                  : t.connected}
          </span>
        </div>
        {!isEnded && (
          <div className="noddi-chat-status-actions">
            <button type="button" className="noddi-chat-resolve-button" onClick={handleResolveChat}>
              {t.markResolved || "Mark as resolved"}
            </button>
            <button type="button" className="noddi-chat-end-button" onClick={handleEndChat}>
              {t.endChat}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="noddi-chat-messages">
        {messages.length === 0 && !isEnded && (
          <div className="noddi-chat-empty">
            <p>{t.startConversation}</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`noddi-chat-message ${message.senderType === "customer" ? "noddi-chat-message-customer" : "noddi-chat-message-agent"}`}
          >
            {message.senderType === "agent" && message.senderName && (
              <span className="noddi-chat-message-sender">{message.senderName}</span>
            )}
            <div
              className="noddi-chat-message-bubble"
              style={message.senderType === "customer" ? { backgroundColor: primaryColor } : {}}
            >
              {message.content && message.content !== "[Attachment]" && message.content}
              {message.attachments && message.attachments.length > 0 && (
                <div className="noddi-chat-attachments">
                  {message.attachments.map((attachment, index) => (
                    <a
                      key={attachment.url}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="noddi-chat-attachment"
                      title={attachment.name}
                    >
                      {attachment.type?.startsWith("image/") ? (
                        <>
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            loading="lazy"
                            className="noddi-chat-attachment-image"
                          />
                          <div className="noddi-chat-attachment-meta">{attachment.name}</div>
                        </>
                      ) : (
                        <span className="noddi-chat-attachment-file">
                          <span aria-hidden="true">📎</span>
                          <span className="noddi-chat-attachment-name">{attachment.name}</span>
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <span className="noddi-chat-message-time">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}

        {agentTyping && (
          <div className="noddi-chat-message noddi-chat-message-agent">
            <div className="noddi-chat-typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {isUploading && <div className="noddi-chat-uploading">{t.attachFile}…</div>}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isEnded && (
        <div className="noddi-chat-input-container">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_ATTACHMENT_TYPES.join(",")}
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />
          <button
            type="button"
            className="noddi-chat-attach"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            aria-label={t.attachFile}
            title={t.attachFile}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            type="text"
            className="noddi-chat-input"
            placeholder={t.typeMessage}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />
          <button
            type="button"
            className="noddi-chat-send"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            style={{ backgroundColor: primaryColor }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      )}

      {!isEnded && uploadError && <div className="noddi-widget-error">{uploadError}</div>}

      {isEnded && (
        <div className="noddi-chat-ended">
          <p>{t.thankYou}</p>
          <ChatRating
            sessionId={session.id}
            primaryColor={primaryColor}
            language={language}
            onDone={onBack}
          />
        </div>
      )}
    </div>
  )
}
