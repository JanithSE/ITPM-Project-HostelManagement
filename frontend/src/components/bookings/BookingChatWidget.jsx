import { useEffect, useMemo, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { bookingChatApi } from '../../shared/api/client'

const STARTER_PROMPTS = [
  'What is my booking status?',
  'Which documents are required?',
  'What should I do next?',
]

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function ChatBubbleIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6l-4 3V6a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

function SendIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function BookingChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [conversationId, setConversationId] = useState(localStorage.getItem('bookingChatConversationId') || '')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sending, setSending] = useState(false)
  const [suggestions, setSuggestions] = useState(STARTER_PROMPTS)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    async function loadHistory() {
      if (!conversationId) {
        if (!cancelled) setMessages([])
        return
      }
      try {
        setLoadingHistory(true)
        const data = await bookingChatApi.getHistory(conversationId)
        if (cancelled) return
        setMessages(Array.isArray(data?.messages) ? data.messages : [])
      } catch {
        if (!cancelled) {
          localStorage.removeItem('bookingChatConversationId')
          setConversationId('')
        }
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }
    }
    loadHistory()
    return () => {
      cancelled = true
    }
  }, [isOpen, conversationId])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const canSend = useMemo(() => Boolean(input.trim()) && !sending, [input, sending])

  const sendMessage = useCallback(
    async (rawText) => {
      const text = String(rawText || '').trim()
      if (!text || sending) return
      const optimistic = {
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
        source: 'system',
      }
      setMessages((prev) => [...prev, optimistic])
      setInput('')
      try {
        setSending(true)
        const data = await bookingChatApi.sendMessage({ message: text, conversationId })
        if (data?.conversationId) {
          setConversationId(data.conversationId)
          localStorage.setItem('bookingChatConversationId', data.conversationId)
        }
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data?.reply || 'No response generated.',
            source: data?.source || 'rules',
            createdAt: new Date().toISOString(),
          },
        ])
        if (Array.isArray(data?.suggestions) && data.suggestions.length) {
          setSuggestions(data.suggestions.slice(0, 3))
        }
      } catch (err) {
        toast.error(err.message || 'Failed to send message')
        setMessages((prev) => prev.slice(0, -1))
      } finally {
        setSending(false)
      }
    },
    [conversationId, sending],
  )

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"
      aria-hidden={!isOpen}
    >
      {isOpen && (
        <div
          className="pointer-events-auto w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-600/80 dark:bg-slate-900"
          role="dialog"
          aria-label="Booking assistant chat"
        >
          <div className="flex items-center justify-between gap-2 bg-primary-600 px-3 py-2.5 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <ChatBubbleIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Booking AI Assistant</p>
                <p className="truncate text-xs text-primary-100">Hostel booking help</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/20"
              aria-label="Close chat"
            >
              <span className="text-lg leading-none" aria-hidden>
                &times;
              </span>
            </button>
          </div>

          <div className="max-h-[min(50vh,320px)] min-h-[180px] space-y-2 overflow-y-auto bg-slate-50 p-3 dark:bg-slate-800/50">
            {loadingHistory ? (
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">Loading…</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Hi! I can help with your booking, documents, and next steps. Try a quick prompt below.
              </p>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={`${m.createdAt || 'm'}-${idx}`}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-snug">{m.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        m.role === 'user' ? 'text-primary-100' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {m.role === 'assistant' ? `${m.source || 'rules'} · ` : ''}
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {messages.length <= 2 && !loadingHistory ? (
            <div className="border-t border-slate-200/80 bg-slate-50/80 px-2 py-2 dark:border-slate-700 dark:bg-slate-800/30">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Suggestions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    disabled={sending}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-left text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-primary-300 hover:bg-primary-50/80 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-600"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage(input)
            }}
            className="border-t border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center gap-2">
              <input
                className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none ring-primary-500/30 placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your booking…"
                maxLength={800}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-md transition hover:bg-primary-700 disabled:opacity-40"
                aria-label="Send message"
              >
                {sending ? (
                  <span className="h-4 w-4 animate-pulse rounded-full bg-white/80" />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg ring-2 ring-white/20 transition hover:bg-primary-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 dark:ring-slate-900/50 dark:focus:ring-offset-slate-900"
        aria-label={isOpen ? 'Minimize chat' : 'Open booking assistant'}
        aria-expanded={isOpen}
      >
        <ChatBubbleIcon className="h-6 w-6" />
      </button>
    </div>
  )
}
