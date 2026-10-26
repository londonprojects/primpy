import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { reviewedAppointmentIds } from '../services/stubs';
import { displayStatus, isUpcoming } from '../utils/booking';
import { dayParts } from '../utils/format';

export interface InboxNote {
  id: string;
  kind: 'reminder' | 'review' | 'offer' | 'system';
  title: string;
  body: string;
  when: string;
  action?: string;
  to?: string;
  unread: boolean;
}

/**
 * Notifications derived from the user's bookings (reminders, review requests)
 * plus a welcome note. TODO(backend): a `notifications` collection written by
 * Cloud Functions, so venues can send offers and Snip changes show up here.
 */
export function useInbox() {
  const { user } = useAuth();
  const { bookings, extras, updateExtras } = useUserData();

  const notes = useMemo<InboxNote[]>(() => {
    if (!user) return [];
    const reviewed = reviewedAppointmentIds(user.id);
    const out: Omit<InboxNote, 'unread'>[] = [];
    const next = bookings
      .filter(isUpcoming)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
    if (next) {
      const p = dayParts(next.date);
      out.push({
        id: `rem-${next.id}-${next.date}-${next.time}`,
        kind: 'reminder',
        title: `Reminder: ${next.serviceName}`,
        body: `${next.barberName} · ${p.dow} ${p.dnum} ${p.mon} at ${next.time}`,
        when: 'Today',
        action: 'View booking',
        to: `/booking/${next.id}`,
      });
    }
    bookings
      .filter((b) => displayStatus(b) === 'completed' && !reviewed.includes(b.id))
      .slice(0, 3)
      .forEach((b) => {
        const p = dayParts(b.date);
        out.push({
          id: `rev-${b.id}`,
          kind: 'review',
          title: `How was your ${b.serviceName.toLowerCase()}?`,
          body: `Leave a review for ${b.barberName} — it takes 30 seconds.`,
          when: `${p.dnum} ${p.mon}`,
          action: 'Write review',
          to: `/review/${b.id}`,
        });
      });
    out.push({
      id: 'welcome',
      kind: 'system',
      title: 'Welcome to Primpy',
      body: 'Your bookings sync with Snip automatically.',
      when: 'Last week',
    });
    return out.map((n) => ({ ...n, unread: !extras.readNotes.includes(n.id) }));
  }, [user, bookings, extras.readNotes]);

  return {
    notes,
    unreadCount: notes.filter((n) => n.unread).length,
    markRead: (id: string) =>
      !extras.readNotes.includes(id) && updateExtras({ readNotes: [...extras.readNotes, id] }),
    markAllRead: () =>
      updateExtras({ readNotes: Array.from(new Set([...extras.readNotes, ...notes.map((n) => n.id)])) }),
  };
}
