import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChatIcon, CloseIcon } from '../ui/icons'

const MAX_LENGTH = 300
const LG_QUERY = '(min-width: 1024px)'

function readIsLargeScreen() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(LG_QUERY).matches
}

function useIsLargeScreen() {
  const [isLarge, setIsLarge] = useState(readIsLargeScreen)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia(LG_QUERY)
    const sync = () => setIsLarge(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return isLarge
}

function formatBadgeCount(count) {
  if (count <= 0) return null
  return count > 99 ? '99+' : String(count)
}

function ChatPanel({ messages, currentUserId, disabled, onSend, inputId, compact }) {
  const [draft, setDraft] = useState('')
  const [localError, setLocalError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages])

  const trimmed = draft.trim()
  const canSend = !disabled && trimmed.length > 0 && trimmed.length <= MAX_LENGTH

  const submit = (event) => {
    event.preventDefault()
    if (!canSend) return
    setLocalError(null)
    if (!onSend(trimmed)) {
      setLocalError('Not connected to the room yet. Please try again.')
      return
    }
    setDraft('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul
        data-testid="room-chat-messages"
        className={`flex flex-col gap-2 overflow-y-auto overscroll-contain px-3 py-3 ${
          compact ? 'min-h-0 flex-1' : 'max-h-56 min-h-36 sm:max-h-72'
        }`}
      >
        {messages.length === 0 ? (
          <li className="my-auto py-6 text-center text-xs text-neutral-500">
            Say hello — everyone in the room can see it.
          </li>
        ) : (
          messages.map((message) => {
            const mine = message.user_id === currentUserId
            return (
              <li
                key={message.id}
                data-testid={`room-chat-message-${message.id}`}
                className={`flex flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}
              >
                <span className="flex max-w-[95%] items-center gap-1.5 text-[11px] text-neutral-500">
                  <span className={`font-medium ${mine ? 'text-emerald-300/90' : 'text-neutral-300'}`}>
                    {mine ? 'You' : message.username}
                  </span>
                  {message.is_room_admin && (
                    <span className="rounded-full bg-white/5 px-1.5 py-px text-[10px] font-medium text-neutral-400 ring-1 ring-white/10">
                      Admin
                    </span>
                  )}
                </span>
                <span
                  className={`max-w-[95%] rounded-2xl px-3 py-1.5 text-sm break-words whitespace-pre-wrap ${
                    mine
                      ? 'rounded-br-md bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-500/25'
                      : 'rounded-bl-md bg-white/5 text-neutral-100 ring-1 ring-white/10'
                  }`}
                >
                  {message.text}
                </span>
              </li>
            )
          })
        )}
        <li aria-hidden="true" ref={bottomRef} className="h-px shrink-0" />
      </ul>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-white/5 p-2.5">
        <label className="sr-only" htmlFor={inputId}>
          Message
        </label>
        <textarea
          id={inputId}
          data-testid="room-chat-input"
          rows={1}
          maxLength={MAX_LENGTH}
          disabled={disabled}
          value={draft}
          placeholder={disabled ? 'Connecting…' : 'Message the room'}
          onChange={(e) => {
            setDraft(e.target.value)
            setLocalError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit(e)
            }
          }}
          className="min-h-10 max-h-24 flex-1 resize-none rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-500 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/15 disabled:opacity-50"
        />
        <button
          type="submit"
          data-testid="room-chat-send"
          disabled={!canSend}
          className="shrink-0 rounded-xl bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-neutral-950 shadow-md shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          Send
        </button>
      </form>
      {localError && (
        <p role="alert" className="px-3 pb-2 text-xs text-red-300">
          {localError}
        </p>
      )}
    </div>
  )
}

/**
 * Group chat for everyone in a musical room.
 * Desktop (lg+): inline panel under participants.
 * Mobile: floating messenger button with an unseen-message badge; opens a bottom sheet.
 *
 * `ready` becomes true after the first `room_state` so history is marked seen and does not
 * inflate the badge; only messages that arrive later while the sheet is closed count.
 */
export default function RoomChat({ messages, currentUserId, disabled, onSend, ready = false }) {
  const isLarge = useIsLargeScreen()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const desktopInputId = useId()
  const sheetInputId = useId()
  const fabRef = useRef(null)
  const sheetRef = useRef(null)
  const seenIdsRef = useRef(new Set())
  const historySeededRef = useRef(false)
  const badge = formatBadgeCount(unreadCount)

  // Desktop never uses the sheet; close it if the viewport grows past lg.
  useEffect(() => {
    if (isLarge) setSheetOpen(false)
  }, [isLarge])

  useEffect(() => {
    if (!ready) return

    if (isLarge || sheetOpen) {
      for (const message of messages) seenIdsRef.current.add(message.id)
      historySeededRef.current = true
      setUnreadCount(0)
      return
    }

    if (!historySeededRef.current) {
      for (const message of messages) seenIdsRef.current.add(message.id)
      historySeededRef.current = true
      return
    }

    let added = 0
    for (const message of messages) {
      if (seenIdsRef.current.has(message.id)) continue
      seenIdsRef.current.add(message.id)
      if (message.user_id !== currentUserId) added += 1
    }
    if (added > 0) setUnreadCount((count) => count + added)
  }, [messages, ready, sheetOpen, isLarge, currentUserId])

  useEffect(() => {
    if (!sheetOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const previous = document.activeElement
    const focusable = sheetRef.current?.querySelector('textarea, button')
    focusable?.focus?.()
    return () => {
      window.removeEventListener('keydown', onKey)
      if (previous instanceof HTMLElement) previous.focus?.()
      else fabRef.current?.focus?.()
    }
  }, [sheetOpen])

  const openSheet = () => setSheetOpen(true)
  const closeSheet = () => setSheetOpen(false)

  // Portaled to document.body so `position: fixed` is not trapped by the room card's
  // `animate-rise` transform (which made the button sit on top of the admin row).
  const mobileChrome =
    !isLarge &&
    typeof document !== 'undefined' &&
    createPortal(
      <>
        {!sheetOpen && (
          <button
            ref={fabRef}
            type="button"
            data-testid="room-chat-fab"
            aria-label={
              badge
                ? `Open room chat, ${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`
                : 'Open room chat'
            }
            aria-expanded={false}
            aria-controls="room-chat-sheet"
            onClick={openSheet}
            className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 text-neutral-950 shadow-[0_12px_40px_rgb(16_185_129/0.45)] ring-2 ring-neutral-950/40 transition duration-200 hover:scale-105 active:scale-95 bottom-[max(6.5rem,calc(5.25rem+env(safe-area-inset-bottom)))]"
          >
            <ChatIcon className="h-6 w-6" />
            {badge && (
              <span
                data-testid="room-chat-badge"
                className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white shadow-md ring-2 ring-neutral-950 tabular-nums"
              >
                {badge}
              </span>
            )}
          </button>
        )}

        {sheetOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end" role="presentation">
            <button
              type="button"
              aria-label="Close chat"
              data-testid="room-chat-backdrop"
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              onClick={closeSheet}
            />
            <section
              ref={sheetRef}
              id="room-chat-sheet"
              data-testid="room-chat-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="room-chat-sheet-title"
              className="relative flex max-h-[min(85dvh,36rem)] min-h-[18rem] w-full flex-col rounded-t-3xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/60 motion-safe:animate-rise"
            >
              <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
                <div className="min-w-0">
                  <h3
                    id="room-chat-sheet-title"
                    className="text-base font-semibold tracking-tight text-white"
                  >
                    Room chat
                  </h3>
                  <p className="text-xs text-neutral-500 tabular-nums">
                    {messages.length} message{messages.length === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="room-chat-close"
                  aria-label="Close chat"
                  onClick={closeSheet}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-neutral-200 ring-1 ring-white/10 transition hover:bg-white/10 active:scale-95"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </header>
              <ChatPanel
                messages={messages}
                currentUserId={currentUserId}
                disabled={disabled}
                onSend={onSend}
                inputId={sheetInputId}
                compact
              />
            </section>
          </div>
        )}
      </>,
      document.body,
    )

  return (
    <>
      {isLarge ? (
        <section
          data-testid="room-chat"
          aria-label="Room chat"
          className="mt-5 flex min-h-0 flex-col rounded-2xl border border-white/5 bg-neutral-950/40"
        >
          <header className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2.5">
            <h3 className="text-sm font-semibold tracking-tight text-white">Chat</h3>
            <span className="text-[11px] text-neutral-500 tabular-nums">{messages.length}</span>
          </header>
          <ChatPanel
            messages={messages}
            currentUserId={currentUserId}
            disabled={disabled}
            onSend={onSend}
            inputId={desktopInputId}
          />
        </section>
      ) : null}
      {mobileChrome}
    </>
  )
}
