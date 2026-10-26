import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';

/** Bottom tab bar for narrow screens (<760px). */
export default function TabBar() {
  const { user } = useAuth();
  const { openAuth } = useUi();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs: { label: string; on: boolean; go: () => void }[] = [
    { label: 'Explore', on: pathname === '/' || pathname.startsWith('/c/'), go: () => navigate('/') },
    { label: 'Search', on: pathname === '/search' || pathname.startsWith('/venue/'), go: () => navigate('/search') },
    { label: 'Bookings', on: pathname.startsWith('/appointments') || pathname.startsWith('/booking/'), go: () => navigate('/appointments') },
    user
      ? { label: 'Account', on: pathname.startsWith('/account'), go: () => navigate('/account') }
      : { label: 'Log in', on: false, go: () => openAuth() },
  ];

  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <button key={t.label} className={t.on ? 'on' : ''} onClick={t.go}>
          <i />
          {t.label}
        </button>
      ))}
    </nav>
  );
}
