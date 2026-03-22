import { useState } from 'react'
import { useContacts, useContact, useContactMessages } from '../hooks/use-contacts'
import { Input } from '../components/ui/input'
import { ListSkeleton, CardSkeleton } from '../components/ui/skeleton'
import { EmptyState } from '../components/ui/empty-state'
import { Users } from 'lucide-react'

function contactStatusBadge(status: string) {
  if (status === 'suppressed') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
        {status}
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      {status}
    </span>
  )
}

function msgStatusBadge(status: string) {
  if (status === 'bounced' || status === 'complained' || status === 'rejected') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
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

export function ContactsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: contacts, isLoading } = useContacts({ page, search: search || undefined })

  if (selectedId) {
    return <ContactDetail contactId={selectedId} onBack={() => setSelectedId(null)} />
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          View contacts and their message history
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <Input
          placeholder="Search by email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-sm bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
        />
      </div>

      {/* Contact list */}
      {isLoading ? (
        <ListSkeleton />
      ) : !contacts || contacts.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No contacts matching your search' : 'No contacts yet'}
          description={search ? 'Try a different search term.' : 'Contacts are created automatically when you send emails.'}
        />
      ) : (
        <div className="glass-card rounded-xl p-5">
          <div className="divide-y divide-border/30">
            {contacts.data.map((contact) => (
              <div
                key={contact.id}
                className="stagger-item flex items-center justify-between py-3 px-1 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
                onClick={() => setSelectedId(contact.id)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{contact.email}</span>
                    {contactStatusBadge(contact.status)}
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    Sent: {contact.totalSent} | Delivered: {contact.totalDelivered}
                    {contact.lastEmailedAt && ` | Last: ${new Date(contact.lastEmailedAt).toLocaleString()}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {contacts && contacts.pages > 1 && (
        <div className="flex items-center justify-center gap-4 text-[13px] text-muted-foreground">
          <button
            className="hover:text-foreground transition-colors disabled:opacity-40"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            &larr; Previous
          </button>
          <span>Page {contacts.page} of {contacts.pages}</span>
          <button
            className="hover:text-foreground transition-colors disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= contacts.pages}
          >
            Next &rarr;
          </button>
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
      <div className="space-y-8">
        <button onClick={onBack} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          Back to contacts
        </button>
        <div className="grid gap-4 md:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <ListSkeleton />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="space-y-8">
        <button onClick={onBack} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          Back to contacts
        </button>
        <p className="text-[13px] text-muted-foreground">Contact not found.</p>
      </div>
    )
  }

  const stats = [
    { label: 'Sent', value: contact.totalSent, color: 'from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]' },
    { label: 'Delivered', value: contact.totalDelivered, color: 'from-emerald-500 to-emerald-400' },
    { label: 'Bounced', value: contact.totalBounced, color: 'from-amber-500 to-orange-400' },
    { label: 'Complained', value: contact.totalComplained, color: 'from-red-500 to-rose-400' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">{contact.email}</h1>
        {contactStatusBadge(contact.status)}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-5 card-lift">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stat.color}`} />
              <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Message history */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]" />
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Message History</span>
        </div>

        {msgsLoading ? (
          <ListSkeleton rows={3} />
        ) : !messages || messages.data.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No messages found.</p>
        ) : (
          <>
            <div className="divide-y divide-border/30">
              {messages.data.map((msg) => (
                <div key={msg.id} className="stagger-item flex items-center justify-between py-3 px-1">
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-medium">{msg.subject}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {msgStatusBadge(msg.status)}
                </div>
              ))}
            </div>

            {messages.pages > 1 && (
              <div className="flex items-center justify-center gap-4 text-[13px] text-muted-foreground pt-4 border-t border-border/30 mt-4">
                <button
                  className="hover:text-foreground transition-colors disabled:opacity-40"
                  onClick={() => setMsgPage((p) => p - 1)}
                  disabled={msgPage <= 1}
                >
                  &larr; Previous
                </button>
                <span>Page {messages.page} of {messages.pages}</span>
                <button
                  className="hover:text-foreground transition-colors disabled:opacity-40"
                  onClick={() => setMsgPage((p) => p + 1)}
                  disabled={msgPage >= messages.pages}
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
