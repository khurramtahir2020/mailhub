import { useState } from 'react'
import { useMessages, useMessage } from '../hooks/use-messages'
import { ListSkeleton } from '../components/ui/skeleton'
import { EmptyState } from '../components/ui/empty-state'
import { Mail } from 'lucide-react'

const statuses = ['all', 'accepted', 'sent', 'delivered', 'bounced', 'complained', 'rejected'] as const

function msgStatusBadge(status: string) {
  if (status === 'bounced' || status === 'complained' || status === 'rejected') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
        {status}
      </span>
    )
  }
  if (status === 'delivered') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        {status}
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
      {status}
    </span>
  )
}

function eventBadge(eventType: string) {
  if (eventType === 'bounce' || eventType === 'complaint') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
        {eventType}
      </span>
    )
  }
  if (eventType === 'delivery') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        {eventType}
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
      {eventType}
    </span>
  )
}

export function MessagesPage() {
  const [status, setStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: messages, isLoading } = useMessages({
    page,
    status: status === 'all' ? undefined : status,
  })

  if (selectedId) {
    return <MessageDetail messageId={selectedId} onBack={() => setSelectedId(null)} />
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          View and filter sent messages and their delivery status
        </p>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
              status === s
                ? 'bg-primary/8 text-primary border border-primary/30'
                : 'bg-secondary hover:bg-secondary/80 border border-transparent'
            }`}
            onClick={() => {
              setStatus(s)
              setPage(1)
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Message list */}
      {isLoading ? (
        <ListSkeleton />
      ) : !messages || messages.data.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No messages found"
          description="Messages appear here after you send emails via the API."
        />
      ) : (
        <div className="glass-card rounded-xl p-5">
          <div className="divide-y divide-border/30">
            {messages.data.map((msg) => (
              <div
                key={msg.id}
                className="stagger-item flex items-center justify-between py-3 px-1 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
                onClick={() => setSelectedId(msg.id)}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{msg.subject}</p>
                  <p className="text-[12px] text-muted-foreground">
                    To: {msg.toEmail} | {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="ml-3 shrink-0">
                  {msgStatusBadge(msg.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {messages && messages.pages > 1 && (
        <div className="flex items-center justify-center gap-4 text-[13px] text-muted-foreground">
          <button
            className="hover:text-foreground transition-colors disabled:opacity-40"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            &larr; Previous
          </button>
          <span>Page {messages.page} of {messages.pages}</span>
          <button
            className="hover:text-foreground transition-colors disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= messages.pages}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  )
}

function MessageDetail({ messageId, onBack }: { messageId: string; onBack: () => void }) {
  const { data: message, isLoading } = useMessage(messageId)

  if (isLoading) {
    return (
      <div className="space-y-8">
        <button onClick={onBack} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          Back to messages
        </button>
        <ListSkeleton rows={3} />
      </div>
    )
  }

  if (!message) {
    return (
      <div className="space-y-8">
        <button onClick={onBack} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          Back to messages
        </button>
        <p className="text-[13px] text-muted-foreground">Message not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">{message.subject}</h1>
        {msgStatusBadge(message.status)}
      </div>

      {/* Details */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]" />
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Details</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">From</span>
            <p className="text-[13px] mt-1">{message.fromEmail}</p>
          </div>
          <div>
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">To</span>
            <p className="text-[13px] mt-1">{message.toEmail}</p>
          </div>
          <div>
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Created</span>
            <p className="text-[13px] mt-1">{new Date(message.createdAt).toLocaleString()}</p>
          </div>
          {message.sesMessageId && (
            <div>
              <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">SES Message ID</span>
              <p className="font-mono text-[12px] mt-1 break-all text-muted-foreground">{message.sesMessageId}</p>
            </div>
          )}
        </div>
      </div>

      {/* Event timeline */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Event Timeline</span>
        </div>

        {!message.events || message.events.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No events recorded yet.</p>
        ) : (
          <div className="space-y-0">
            {message.events.map((event, i) => (
              <div key={event.id} className="stagger-item flex gap-4 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)] mt-2" />
                  {i < message.events.length - 1 && (
                    <div className="w-px flex-1 bg-border/30 mt-1" />
                  )}
                </div>
                <div className="space-y-1 pb-2">
                  <div className="flex items-center gap-2">
                    {eventBadge(event.eventType)}
                    <span className="text-[12px] text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {event.bounceType && (
                    <p className="text-[12px] text-muted-foreground">
                      Bounce: {event.bounceType}{event.bounceSubtype ? ` / ${event.bounceSubtype}` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
