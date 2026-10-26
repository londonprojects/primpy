import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInbox } from '../hooks/useInbox';
import { LoginGate, Spinner } from '../components/ui';

export default function InboxPage() {
  const { user, loading } = useAuth();
  const { notes, markRead, markAllRead } = useInbox();
  const navigate = useNavigate();

  if (loading) return <Spinner />;
  if (!user)
    return (
      <div className="wrap w780 page">
        <LoginGate title="Inbox" text="Log in to see reminders and updates about your bookings." />
      </div>
    );

  return (
    <div className="wrap w780 page">
      <div className="between" style={{ marginBottom: 20 }}>
        <h1 className="h-page">Inbox</h1>
        <button className="btn-text" style={{ padding: '10px 0' }} onClick={markAllRead}>
          Mark all as read
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--line)' }}>
        {notes.map((n) => (
          <button
            key={n.id}
            className="inbox-row"
            onClick={() => {
              markRead(n.id);
              if (n.to) navigate(n.to);
            }}
            style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '18px 4px', border: 0, borderBottom: '1px solid var(--line)', background: 'none', textAlign: 'left', color: 'var(--ink)', width: '100%' }}
          >
            <span style={{ flex: '0 0 auto', width: 10, height: 10, borderRadius: '50%', background: n.unread ? 'var(--teal)' : 'transparent', marginTop: 6 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: n.unread ? 700 : 500 }}>{n.title}</span>
                <span className="muted" style={{ flex: '0 0 auto', fontSize: 13 }}>{n.when}</span>
              </div>
              <div className="muted" style={{ fontSize: 14, marginTop: 3 }}>{n.body}</div>
              {n.action && <div style={{ color: 'var(--teal)', fontSize: 14, fontWeight: 700, marginTop: 8 }}>{n.action} →</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
