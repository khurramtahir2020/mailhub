import { useState } from 'react'
import { useContacts, useContact, useContactMessages } from '../hooks/use-contacts'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'

export function ContactsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: contacts, isLoading } = useContacts({ page, search: search || undefined })

  if (selectedId) {
    return <ContactDetail contactId={selectedId} onBack={() => setSelectedId(null)} />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>

      <div className="flex gap-3">
        <Input
          placeholder="Search by email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading...</p>
          ) : !contacts || contacts.data.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              {search ? 'No contacts matching your search.' : 'No contacts yet. Contacts are created automatically when you send emails.'}
            </p>
          ) : (
            <div className="divide-y">
              {contacts.data.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => setSelectedId(contact.id)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{contact.email}</span>
                      <Badge variant={contact.status === 'suppressed' ? 'destructive' : 'secondary'} className="text-xs">
                        {contact.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sent: {contact.totalSent} | Delivered: {contact.totalDelivered}
                      {contact.lastEmailedAt && ` | Last: ${new Date(contact.lastEmailedAt).toLocaleString()}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {contacts && contacts.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {contacts.page} of {contacts.pages} ({contacts.total} total)
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
              disabled={page >= contacts.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ContactDetail({ contactId, onBack }: { contactId: string; onBack: () => void }) {
  const { data: contact, isLoading } = useContact(contactId)
  const [msgPage, setMsgPage] = useState(1)
  const { data: messages, isLoading: msgsLoading } = useContactMessages(contactId, msgPage)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>Back to contacts</Button>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>Back to contacts</Button>
        <p className="text-sm text-muted-foreground">Contact not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <h1 className="text-2xl font-semibold tracking-tight">{contact.email}</h1>
        <Badge variant={contact.status === 'suppressed' ? 'destructive' : 'secondary'}>
          {contact.status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{contact.totalSent}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{contact.totalDelivered}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bounced</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{contact.totalBounced}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Complained</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{contact.totalComplained}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Message History</CardTitle>
        </CardHeader>
        <CardContent>
          {msgsLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !messages || messages.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages found.</p>
          ) : (
            <div className="space-y-3">
              {messages.data.map((msg) => (
                <div key={msg.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{msg.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={msg.status === 'bounced' || msg.status === 'complained' || msg.status === 'rejected' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {msg.status}
                  </Badge>
                </div>
              ))}

              {messages.pages > 1 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Page {messages.page} of {messages.pages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMsgPage((p) => p - 1)}
                        disabled={msgPage <= 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMsgPage((p) => p + 1)}
                        disabled={msgPage >= messages.pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
