export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-cols">
        <div>
          <div className="logo" style={{ fontSize: 20 }}>
            Primpy<span className="dot">.</span>
          </div>
          <p style={{ maxWidth: 260, fontSize: 14 }}>
            Book hair, beauty, nails, massage &amp; spa treatments near you.
          </p>
        </div>
        <div>
          <h4>Treatments</h4>
          <a href="/search?category=hair">Hair</a>
          <a href="/search?category=nails">Nails</a>
          <a href="/search?category=massage">Massage</a>
          <a href="/search?category=facials">Facials &amp; Skin</a>
        </div>
        <div>
          <h4>Company</h4>
          <a href="/">About</a>
          <a href="/">For business</a>
          <a href="/">Careers</a>
        </div>
        <div>
          <h4>Support</h4>
          <a href="/">Help centre</a>
          <a href="/">Privacy</a>
          <a href="/">Terms</a>
        </div>
      </div>
      <div className="container" style={{ marginTop: 24, fontSize: 13 }}>
        © {new Date().getFullYear()} Primpy · Powered by the Snip backend
      </div>
    </footer>
  );
}
