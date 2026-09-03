import DOMPurify from "dompurify"
import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  escalateAiChat,
  getApiUrl,
  pollAiChat,
  resolveAiChat,
  sendAiMessage,
  streamAiMessage,
} from "../api"
import { getWidgetTranslations } from "../translations"
import { type MessageBlock, parseMessageBlocks } from "../utils/parseMessageBlocks"
import { AiFeedback } from "./AiFeedback"
import { getBlock } from "./blocks"

interface AiChatMessage {
  id: string
  serverId?: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  hidden?: boolean
  /** True when this message was written by a human agent who took over the chat. */
  fromAgent?: boolean
  senderName?: string
}

type EscalationStatus = "none" | "escalated" | "assigned" | "resolved"

const ESCALATION_KEY = "noddi_ai_escalation_status"

interface AiChatProps {
  widgetKey: string
  primaryColor: string
  language: string
  enableChat: boolean
  enableContactForm: boolean
  onEmailConversation: (transcript: string) => void
  onBack: () => void
  onLogEvent?: (
    event: string,
    details?: string,
    type?: "info" | "tool" | "error" | "success",
  ) => void
}

const STORAGE_KEY = "noddi_ai_chat_messages"
const CONVERSATION_ID_KEY = "noddi_ai_conversation_id"
const VERIFIED_PHONE_KEY = "noddi_ai_verified_phone"
const VISITOR_TOKEN_KEY = "noddi_ai_visitor_token"

function loadMessages(): AiChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const cutoff = Date.now() - 24 * 60 * 60 * 1000
      return parsed
        .filter((m: any) => new Date(m.timestamp).getTime() > cutoff)
        .map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
    }
  } catch {
    /* ignore */
  }
  return []
}

function saveMessages(messages: AiChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {
    /* ignore */
  }
}

// Simple markdown-like formatting for AI responses
function formatAiResponse(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/<\/ul>\s*<ul>/g, "")
    .replace(/\n/g, "<br/>")
}

// ========== Registry-Driven Block Renderer ==========

interface MessageBlockRendererProps {
  blocks: MessageBlock[]
  messageId: string
  primaryColor: string
  widgetKey: string
  conversationId: string | null
  language: string
  usedBlocks: Set<string>
  onActionSelect: (option: string, blockKey: string) => void
  onPhoneVerified: (phone: string, blockKey: string) => void
  onLogEvent?: AiChatProps["onLogEvent"]
}

const MessageBlockRenderer: React.FC<MessageBlockRendererProps> = ({
  blocks,
  messageId,
  primaryColor,
  widgetKey,
  conversationId,
  language,
  usedBlocks,
  onActionSelect,
  onPhoneVerified,
  onLogEvent,
}) => {
  return (
    <>
      {blocks.map((block, idx) => {
        if (block.type === "text") {
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: block list lacks stable ids
              key={idx}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML sanitized via DOMPurify
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(formatAiResponse(block.content)),
              }}
            />
          )
        }

        const def = getBlock(block.type)
        if (!def) return null

        // Build the onAction handler — phone_verify uses a special handler
        const handleAction =
          def.type === "phone_verify"
            ? (value: string, blockKey: string) => onPhoneVerified(value, blockKey)
            : (value: string, blockKey: string) => {
                // For non-API blocks, persist selection in localStorage
                if (!def.requiresApi) {
                  localStorage.setItem(`noddi_action_${blockKey}`, value)
                }
                onActionSelect(value, blockKey)
              }

        return (
          <def.component
            // biome-ignore lint/suspicious/noArrayIndexKey: list lacks stable ids
            key={idx}
            primaryColor={primaryColor}
            messageId={messageId}
            blockIndex={idx}
            usedBlocks={usedBlocks}
            onAction={handleAction}
            data={block}
            // API props only if needed
            {...(def.requiresApi ? { widgetKey, conversationId, language, onLogEvent } : {})}
          />
        )
      })}
    </>
  )
}

// ========== Main Component ==========

export const AiChat: React.FC<AiChatProps> = ({
  widgetKey,
  primaryColor,
  language,
  enableChat,
  enableContactForm,
  onEmailConversation,
  onBack,
  onLogEvent,
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>(loadMessages)
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [conversationId, setConversationId] = useState<string | null>(() =>
    localStorage.getItem(CONVERSATION_ID_KEY),
  )
  // Per-conversation capability token minted by the backend; required to
  // escalate/resolve/poll so a visitor can only act on their own chat.
  const visitorTokenRef = useRef<string | null>(localStorage.getItem(VISITOR_TOKEN_KEY))
  const captureVisitorToken = useCallback((token?: string) => {
    if (token && token !== visitorTokenRef.current) {
      visitorTokenRef.current = token
      try {
        localStorage.setItem(VISITOR_TOKEN_KEY, token)
      } catch {
        /* storage unavailable */
      }
    }
  }, [])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [usedBlocks, setUsedBlocks] = useState<Set<string>>(new Set())
  const [verifiedPhone, setVerifiedPhone] = useState(
    () => localStorage.getItem(VERIFIED_PHONE_KEY) || "",
  )
  const [escalationStatus, setEscalationStatus] = useState<EscalationStatus>(
    () => (localStorage.getItem(ESCALATION_KEY) as EscalationStatus) || "none",
  )
  const [assignedAgentName, setAssignedAgentName] = useState<string | null>(null)
  // ISO timestamp of the newest human-agent message already shown.
  const lastAgentSeenRef = useRef<string | undefined>(undefined)

  const t = getWidgetTranslations(language)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  useEffect(() => {
    if (conversationId) localStorage.setItem(CONVERSATION_ID_KEY, conversationId)
  }, [conversationId])

  useEffect(() => {
    localStorage.setItem(ESCALATION_KEY, escalationStatus)
  }, [escalationStatus])

  // Flag the conversation for a human. The AI keeps answering; a human takes
  // over the same thread when ready (we learn that via polling below).
  const startEscalation = useCallback(async () => {
    if (!conversationId || !visitorTokenRef.current) return
    setEscalationStatus((prev) => (prev === "assigned" || prev === "resolved" ? prev : "escalated"))
    await escalateAiChat(widgetKey, conversationId, visitorTokenRef.current)
    onLogEvent?.("Escalated to human", "Customer requested a human agent", "info")
  }, [conversationId, widgetKey, onLogEvent])

  // While escalated or handed off, poll for the human agent's status + replies.
  useEffect(() => {
    if (!conversationId) return
    if (escalationStatus !== "escalated" && escalationStatus !== "assigned") return

    if (!visitorTokenRef.current) return

    let cancelled = false
    const tick = async () => {
      const token = visitorTokenRef.current
      if (!token) return
      const result = await pollAiChat(widgetKey, conversationId, token, lastAgentSeenRef.current)
      if (cancelled || !result) return

      setAssignedAgentName(result.assignedAgentName)
      if (result.status === "assigned") setEscalationStatus("assigned")
      else if (result.status === "resolved" || result.status === "ended")
        setEscalationStatus("resolved")

      if (result.messages.length > 0) {
        lastAgentSeenRef.current = result.messages[result.messages.length - 1].createdAt
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.serverId).filter(Boolean))
          const fresh = result.messages
            .filter((m) => !seen.has(m.id))
            .map((m) => ({
              id: `agent_${m.id}`,
              serverId: m.id,
              role: "assistant" as const,
              content: m.content,
              timestamp: new Date(m.createdAt),
              fromAgent: true,
              senderName: result.assignedAgentName || undefined,
            }))
          return fresh.length > 0 ? [...prev, ...fresh] : prev
        })
      }
    }

    void tick()
    const interval = setInterval(() => void tick(), 4000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [conversationId, widgetKey, escalationStatus])

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { id: "greeting", role: "assistant", content: t.aiGreeting, timestamp: new Date() },
      ])
    }
  }, [messages.length, t.aiGreeting])

  const isPhoneVerified = !!verifiedPhone

  const sendMessage = useCallback(
    async (content: string, phoneOverride?: string, options?: { hidden?: boolean }) => {
      if (!content) return
      if (isLoading && !options?.hidden) return // Only block visible user input while loading
      const effectivePhone = phoneOverride || verifiedPhone
      const effectiveVerified = !!effectivePhone
      const isHidden = options?.hidden ?? false

      const userMessage: AiChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
        hidden: isHidden,
      }
      setMessages((prev) => [...prev, userMessage]) // Always add to state for history; hidden messages are filtered from UI
      setIsLoading(true)
      setStreamingContent("")
      onLogEvent?.("User message", content.slice(0, 100), "info")

      try {
        const history = [...messages, userMessage]
          .filter((m) => m.id !== "greeting")
          .map((m) => ({ role: m.role, content: m.content }))

        let fullReply = ""
        let gotStream = false
        let serverMessageId: string | undefined

        try {
          await streamAiMessage(
            widgetKey,
            history,
            effectivePhone || undefined,
            undefined,
            language,
            conversationId || undefined,
            (token) => {
              gotStream = true
              fullReply += token
              setStreamingContent(fullReply)
            },
            (meta) => {
              if (meta.conversationId) setConversationId(meta.conversationId)
              if (meta.messageId) serverMessageId = meta.messageId
              captureVisitorToken(meta.visitorToken)
            },
            effectiveVerified,
          )
        } catch {
          if (!gotStream) {
            const result = await sendAiMessage(
              widgetKey,
              history,
              effectivePhone || undefined,
              undefined,
              language,
            )
            fullReply = typeof result === "string" ? result : result.reply
            if (result.conversationId) setConversationId(result.conversationId)
            if (result.messageId) serverMessageId = result.messageId
            captureVisitorToken(result.visitorToken)
          }
          onLogEvent?.("AI stream fallback", "Used non-streaming endpoint", "info")
        }

        if (fullReply) {
          const aiMsg: AiChatMessage = {
            id: `ai_${Date.now()}`,
            serverId: serverMessageId,
            role: "assistant",
            content: fullReply,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, aiMsg])
          onLogEvent?.("AI response", fullReply.slice(0, 100), "success")
        }
      } catch (err) {
        console.error("[Noddi Widget] AI chat error:", err)
        setMessages((prev) => [
          ...prev,
          {
            id: `error_${Date.now()}`,
            role: "assistant",
            content: t.aiError,
            timestamp: new Date(),
          },
        ])
      }

      setStreamingContent("")
      setIsLoading(false)
    },
    [
      isLoading,
      messages,
      widgetKey,
      verifiedPhone,
      language,
      conversationId,
      t,
      onLogEvent,
      captureVisitorToken,
    ],
  )

  const handleSend = useCallback(async () => {
    const content = inputValue.trim()
    if (!content) return
    setInputValue("")
    await sendMessage(content)
  }, [inputValue, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleActionSelect = useCallback(
    (option: string, blockKey: string) => {
      localStorage.setItem(`noddi_action_${blockKey}`, option)
      setUsedBlocks((prev) => new Set(prev).add(blockKey))

      // Resolution-check sentinels: update local state only — the block already
      // told the backend to resolve/escalate, and we never send these to the AI.
      if (option === "__RESOLVED__") {
        setEscalationStatus("resolved")
        if (conversationId && visitorTokenRef.current)
          void resolveAiChat(widgetKey, conversationId, visitorTokenRef.current)
        return
      }
      if (option === "__ESCALATE__") {
        void startEscalation()
        onLogEvent?.("Escalated to human", "Customer chose to talk to a human", "info")
        return
      }

      // Save star ratings to feedback DB
      const ratingMatch = option.match(/^Rating: (\d)\/5$/)
      if (ratingMatch && conversationId) {
        const stars = parseInt(ratingMatch[1], 10)
        const localMsgId = blockKey.split(":")[0]
        const msg = messages.find((m) => m.id === localMsgId)
        if (msg?.serverId) {
          const apiBase = getApiUrl()
          fetch(`${apiBase}/widget-ai-feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              widgetKey,
              messageId: msg.serverId,
              conversationId,
              rating: stars >= 4 ? "positive" : "negative",
              feedbackText: `Star rating: ${stars}/5`,
              source: "rating_block",
            }),
          }).catch(() => {
            /* best effort */
          })
        }
      }

      // Always send as hidden — the block's inline badge provides visual feedback
      void sendMessage(option, undefined, { hidden: true })
    },
    [sendMessage, conversationId, messages, widgetKey, onLogEvent, startEscalation],
  )

  const handlePhoneVerified = useCallback(
    (phone: string, blockKey: string) => {
      setVerifiedPhone(phone)
      setUsedBlocks((prev) => new Set(prev).add(blockKey))
      setTimeout(() => {
        void sendMessage("__VERIFIED__", phone, { hidden: true })
      }, 500)
    },
    [sendMessage],
  )

  const buildTranscript = (): string => {
    return messages
      .filter((m) => m.id !== "greeting")
      .map((m) => `${m.role === "user" ? "Customer" : "AI Assistant"}: ${m.content}`)
      .join("\n\n")
  }

  const handleNewConversation = useCallback(() => {
    setMessages([
      { id: "greeting", role: "assistant", content: t.aiGreeting, timestamp: new Date() },
    ])
    setConversationId(null)
    setStreamingContent("")
    setInputValue("")
    setUsedBlocks(new Set())
    setVerifiedPhone("")
    setEscalationStatus("none")
    setAssignedAgentName(null)
    lastAgentSeenRef.current = undefined
    visitorTokenRef.current = null
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(CONVERSATION_ID_KEY)
    localStorage.removeItem(VERIFIED_PHONE_KEY)
    localStorage.removeItem(ESCALATION_KEY)
    localStorage.removeItem(VISITOR_TOKEN_KEY)
  }, [t])

  return (
    <div className="noddi-widget-chat">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
        {messages.length > 1 && (
          <button
            type="button"
            className="noddi-ai-new-conversation-btn"
            onClick={handleNewConversation}
            title={t.startNewConversation}
            style={{ color: primaryColor }}
          >
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
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            {t.startNewConversation}
          </button>
        )}
      </div>

      <div className="noddi-chat-messages">
        {messages
          .filter((m) => !m.hidden)
          .map((message) => {
            const blocks =
              message.role === "assistant"
                ? parseMessageBlocks(message.content)
                : [{ type: "text" as const, content: message.content }]

            return (
              <div
                key={message.id}
                className={`noddi-chat-message ${message.role === "user" ? "noddi-chat-message-customer" : "noddi-chat-message-agent"}`}
              >
                {message.role === "assistant" && (
                  <span className="noddi-chat-message-sender">
                    {message.fromAgent ? message.senderName || t.chattingWith : t.aiAssistant}
                  </span>
                )}
                <div
                  className="noddi-chat-message-bubble"
                  style={message.role === "user" ? { backgroundColor: primaryColor } : {}}
                >
                  <MessageBlockRenderer
                    blocks={blocks}
                    messageId={message.id}
                    primaryColor={primaryColor}
                    widgetKey={widgetKey}
                    conversationId={conversationId}
                    language={language}
                    usedBlocks={usedBlocks}
                    onActionSelect={handleActionSelect}
                    onPhoneVerified={handlePhoneVerified}
                    onLogEvent={onLogEvent}
                  />
                </div>
                {message.role === "assistant" &&
                  message.id !== "greeting" &&
                  conversationId &&
                  message.serverId && (
                    <AiFeedback
                      messageId={message.serverId}
                      conversationId={conversationId}
                      widgetKey={widgetKey}
                      primaryColor={primaryColor}
                    />
                  )}
                <span className="noddi-chat-message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )
          })}

        {streamingContent && (
          <div className="noddi-chat-message noddi-chat-message-agent">
            <span className="noddi-chat-message-sender">{t.aiAssistant}</span>
            <div
              className="noddi-chat-message-bubble"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML sanitized via DOMPurify
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(formatAiResponse(streamingContent)),
              }}
            />
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className="noddi-chat-message noddi-chat-message-agent">
            <div className="noddi-chat-typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* "Finding a person" banner while waiting for a human to take over. */}
      {escalationStatus === "escalated" && (
        <div className="noddi-ai-escalation-banner" role="status">
          <div className="noddi-ai-escalation-banner-title">
            <span className="noddi-chat-typing" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
            {t.findingHuman}
          </div>
          <p className="noddi-ai-escalation-banner-hint">{t.findingHumanHint}</p>
        </div>
      )}

      {/* A human has joined and is now handling the chat. */}
      {escalationStatus === "assigned" && (
        <div className="noddi-ai-escalation-banner" role="status">
          <div className="noddi-ai-escalation-banner-title">
            {assignedAgentName ? `${t.chattingWith} ${assignedAgentName}` : t.agentJoined}
          </div>
        </div>
      )}

      {/* Talk-to-a-human entry point (soft escalation — the AI keeps answering). */}
      {escalationStatus === "none" && messages.length > 2 && (
        <div className="noddi-ai-escalation">
          {enableChat && conversationId ? (
            <button
              type="button"
              className="noddi-ai-escalation-btn"
              onClick={() => void startEscalation()}
            >
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
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              {t.talkToHuman}
            </button>
          ) : enableContactForm ? (
            <button
              type="button"
              className="noddi-ai-escalation-btn"
              onClick={() => onEmailConversation(buildTranscript())}
            >
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
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              {t.emailConversation}
            </button>
          ) : null}
        </div>
      )}

      <div className="noddi-chat-input-container">
        <input
          type="text"
          className="noddi-chat-input"
          placeholder={t.askAnything}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          type="button"
          className="noddi-chat-send"
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
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
    </div>
  )
}
