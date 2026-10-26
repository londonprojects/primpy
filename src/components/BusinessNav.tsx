import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const tabs = [
  { to: '/business/bookings', label: 'Bookings' },
  { to: '/business/treatments', label: 'Treatments' },
  { to: '/business/profile', label: 'Venue profile' },
];

/** Shared header for the business dashboard pages. */
export default function BusinessNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const doSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="biz-head">
      <div className="between" style={{ marginBottom: 18 }}>
        <h1 className="display" style={{ fontWeight: 800, fontSize: 'clamp(26px,4vw,38px)', letterSpacing: '-.03em', margin: 0 }}>
          Business dashboard
        </h1>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-outline btn-sm h44" style={{ fontSize: 14 }} onClick={() => user && navigate(`/venue/${user.id}`)}>
            View public page
          </button>
          <button className="btn btn-danger-soft btn-sm h44" style={{ fontSize: 14 }} onClick={doSignOut}>
            Sign out
          </button>
        </div>
      </div>
      <div className="biz-nav">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `biz-tab${isActive ? ' on' : ''}`}>
            {t.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
