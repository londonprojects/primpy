import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { useInbox } from '../hooks/useInbox';
import { useNarrow, useOnline } from '../hooks/useMedia';
import { firstName } from '../utils/format';
import Logo from './Logo';

export default function Header() {
  const { user } = useAuth();
  const { openAuth } = useUi();
  const { unreadCount } = useInbox();
  const narrow = useNarrow();
  const online = useOnline();
  const navigate = useNavigate();

  return (
    <>
      <header className="header">
        <div className="wrap header-inner">
          <Logo onClick={() => navigate('/')} />
          {!narrow && (
            <>
              <button className="search-pill" onClick={() => navigate('/search')}>
                <i />
                Search treatments or venues
              </button>
              <nav className="nav">
                <button className="nav-link" onClick={() => navigate('/saved')}>
                  Saved
                </button>
                <button className="nav-link" onClick={() => navigate('/inbox')}>
                  Inbox
                  {unreadCount > 0 && <span className="unread">{unreadCount}</span>}
                </button>
                <button className="nav-link" onClick={() => navigate('/search')}>
                  Explore
                </button>
                {user && (user.role === 'barber' || user.role === 'admin') ? (
                  <button className="nav-link" onClick={() => navigate('/business')}>
                    Dashboard
                  </button>
                ) : (
                  <>
                    <button className="nav-link" onClick={() => navigate('/appointments')}>
                      My bookings
                    </button>
                    <button className="nav-link" onClick={() => navigate('/business/signup')}>
                      For business
                    </button>
                  </>
                )}
                {user ? (
                  <button className="avatar-chip" title="Account" onClick={() => navigate('/account')}>
                    {user.avatar ? (
                      <span className="chip-img"><img src={user.avatar} alt="" /></span>
                    ) : (
                      <span>{user.displayName[0]?.toUpperCase()}</span>
                    )}
                    {firstName(user.displayName)}
                  </button>
                ) : (
                  <button className="btn btn-teal btn-sm h44" style={{ fontSize: 15, padding: '0 20px', marginLeft: 6 }} onClick={() => openAuth()}>
                    Log in
                  </button>
                )}
              </nav>
            </>
          )}
        </div>
      </header>
      {!online && (
        <div className="offline">You're offline — showing your saved bookings. We'll sync when you're back.</div>
      )}
    </>
  );
}
