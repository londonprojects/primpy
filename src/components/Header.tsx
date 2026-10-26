import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          Primpy<span className="dot">.</span>
        </Link>
        <nav className="header-nav">
          <Link to="/search" className="header-link">
            Browse
          </Link>
          {user ? (
            <>
              <Link to="/appointments" className="header-link">
                My bookings
              </Link>
              <span className="header-link subtle">Hi, {user.displayName.split(' ')[0]}</span>
              <button className="btn btn-outline" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="header-link">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
