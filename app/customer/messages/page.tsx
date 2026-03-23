'use client';

import { useEffect, useState } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  Plus,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import MessageThread from '@/components/customer/MessageThread';
import TicketForm from '@/components/customer/TicketForm';
import TicketList from '@/components/customer/TicketList';
import NotificationCenter from '@/components/customer/NotificationCenter';

const FAQ_ITEMS = [
  {
    q: 'How do I make a payment?',
    a: 'Go to the Payments page and click "Pay Now" next to the installment you want to pay. You can pay online using UPI, credit/debit card, or net banking.',
  },
  {
    q: 'When will my documents be verified?',
    a: 'Documents are typically verified within 2-3 business days. You will receive a notification once verified.',
  },
  {
    q: 'How can I get a copy of my agreement?',
    a: 'Once the agreement is signed, a copy will be available in your Documents section. You can also request one from your assigned agent.',
  },
  {
    q: 'What happens if I miss a payment?',
    a: 'If a payment is missed, it will be marked as overdue. Please contact your agent to discuss a revised payment plan. Late fees may apply as per the agreement terms.',
  },
  {
    q: 'How do I contact my agent?',
    a: 'You can reach your agent via WhatsApp by clicking the WhatsApp button on your booking detail page, or submit a query through this Messages section.',
  },
  {
    q: 'When will I get possession?',
    a: 'Possession dates depend on the project timeline and your payment completion. Check the booking timeline on your booking detail page for the latest status.',
  },
];

export default function MessagesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'messages' | 'tickets' | 'faq'>(
    'tickets',
  );
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/customer/messages').then((r) => r.json()),
      fetch('/api/customer/bookings').then((r) => r.json()),
    ])
      .then(([msgData, bookData]) => {
        if (msgData.success) setData(msgData.data);
        else setError(msgData.error || 'Failed to load messages');
        if (bookData.success) {
          setBookings(
            bookData.data.bookings.map((b: any) => ({
              id: b.id,
              bookingNumber: b.bookingNumber,
              projectName: b.project.name,
            })),
          );
        }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const refreshMessages = () => {
    fetch('/api/customer/messages')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
      });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        <div className="h-64 rounded-xl bg-secondary animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const { messages, tickets, notifications } = data;

  const tabs = [
    { key: 'tickets', label: 'Support Tickets', count: tickets.length },
    { key: 'messages', label: 'Communications', count: messages.length },
    { key: 'faq', label: 'FAQ' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Messages & Support
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View communications, submit queries, and find answers.
          </p>
        </div>
        <button
          onClick={() => setShowNewTicket(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Query
        </button>
      </div>

      {/* New ticket modal */}
      {showNewTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Submit a Query
              </h2>
              <button
                onClick={() => setShowNewTicket(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <TicketForm
              bookings={bookings}
              onSuccess={() => {
                setShowNewTicket(false);
                refreshMessages();
              }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border" role="tablist" aria-label="Message sections">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            {tab.label}
            {'count' in tab && tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Tickets tab */}
          {activeTab === 'tickets' && (
            <div className="rounded-xl border border-border bg-card">
              <TicketList tickets={tickets} />
            </div>
          )}

          {/* Messages tab */}
          {activeTab === 'messages' && (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <MessageThread messages={messages} />
            </div>
          )}

          {/* FAQ tab */}
          {activeTab === 'faq' && (
            <div className="space-y-2">
              {FAQ_ITEMS.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedFaq(expandedFaq === idx ? null : idx)
                    }
                    className="w-full flex items-center justify-between p-4 text-left"
                    aria-expanded={expandedFaq === idx}
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground">
                        {faq.q}
                      </span>
                    </div>
                    {expandedFaq === idx ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-4 pb-4 pl-12">
                      <p className="text-sm text-muted-foreground">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: notifications */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Recent Notifications
          </h3>
          <NotificationCenter notifications={notifications} />
        </div>
      </div>
    </div>
  );
}
