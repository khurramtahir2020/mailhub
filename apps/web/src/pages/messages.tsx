import { useState } from 'react'
import { useMessages, useMessage } from '../hooks/use-messages'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'

const statuses = ['all', 'accepted', 'sent', 'delivered', 'bounced', 'complained', 'rejected'] as const

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>

      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <Button
            key={s}
            variant={status === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatus(s)
              setPage(1)
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading...</p>
          ) : !messages || messages.data.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No messages found. Messages appear here after you send emails via the API.
            </p>
          ) : (
            <div className="divide-y">
              {messages.data.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => setSelectedId(msg.id)}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{msg.subject}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      To: {msg.toEmail} | {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={msg.status === 'bounced' || msg.status === 'complained' || msg.status === 'rejected' ? 'destructive' : 'secondary'}
                    className="text-xs ml-3 shrink-0"
                  >
                    {msg.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {messages && messages.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {messages.page} of {messages.pages} ({messages.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= messages.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageDetail({ messageId, onBack }: { messageId: string; onBack: () => void }) {
  const { data: message, isLoading } = useMessage(messageId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>Back to messages</Button>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!message) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>Back to messages</Button>
        <p className="text-sm text-muted-foreground">Message not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <h1 className="text-2xl font-semibold tracking-tight">{message.subject}</h1>
        <Badge
          variant={message.status === 'bounced' || message.status === 'complained' || message.status === 'rejected' ? 'destructive' : 'secondary'}
        >
          {message.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">From</p>
              <p className="text-sm">{message.fromEmail}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">To</p>
              <p className="text-sm">{message.toEmail}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Created</p>
              <p className="text-sm">{new Date(message.createdAt).toLocaleString()}</p>
            </div>
            {message.sesMessageId && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">SES Message ID</p>
                <p className="text-sm font-mono text-xs break-all">{message.sesMessageId}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {!message.events || message.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events recorded yet.</p>
          ) : (
            <div className="space-y-0">
              {message.events.map((event, i) => (
                <div key={event.id} className="flex gap-4 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-foreground mt-2" />
                    {i < message.events.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="space-y-1 pb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={event.eventType === 'bounce' || event.eventType === 'complaint' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {event.eventType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {event.bounceType && (
                      <p className="text-xs text-muted-foreground">
                        Bounce: {event.bounceType}{event.bounceSubtype ? ` / ${event.bounceSubtype}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
