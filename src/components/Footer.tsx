import { Link } from 'react-router-dom';
import Logo from './Logo';
import { COMMISSION_PCT, REPEAT_PCT } from '../config/pricing';

/** Site footer. Links to the partner pricing page from every screen. */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <Logo />
          <p className="muted">Book beauty &amp; wellness in two taps. One account with Snip.</p>
        </div>
        <nav className="footer-col" aria-label="For guests">
          <div className="footer-h">For guests</div>
          <Link to="/search">Explore venues</Link>
          <Link to="/gift">Gift cards</Link>
          <Link to="/help">Help &amp; policies</Link>
        </nav>
        <nav className="footer-col" aria-label="For business">
          <div className="footer-h">For business</div>
          <Link to="/pricing">Pricing</Link>
          <Link to="/business/signup">List your venue on Primpy</Link>
          <span className="muted footer-note">Free to list · {COMMISSION_PCT} on new clients’ first booking · {REPEAT_PCT} on repeat &amp; direct</span>
        </nav>
      </div>
    </footer>
  );
}
