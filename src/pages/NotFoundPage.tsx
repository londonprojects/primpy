import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="wrap w560" style={{ padding: 'clamp(48px,10vw,120px) var(--gutter) 64px', textAlign: 'center' }}>
      <div className="display" style={{ fontWeight: 800, fontSize: 'clamp(80px,16vw,160px)', letterSpacing: '-.05em', lineHeight: 0.85, color: 'var(--teal)' }}>
        404
      </div>
      <h1 className="display" style={{ fontWeight: 800, fontSize: 'clamp(28px,4vw,40px)', letterSpacing: '-.03em', margin: '20px 0 10px' }}>
        This venue isn't here anymore
      </h1>
      <p className="muted" style={{ fontSize: 16, margin: '0 0 24px' }}>
        It may have moved or stopped taking bookings on Primpy.
      </p>
      <div className="row" style={{ gap: 10, justifyContent: 'center' }}>
        <button className="btn btn-teal h52 btn-bold" onClick={() => navigate('/search')}>
          Find similar venues
        </button>
        <button className="btn btn-outline h52" onClick={() => navigate('/')}>
          Go home
        </button>
      </div>
    </div>
  );
}
