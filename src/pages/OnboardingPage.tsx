import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categories } from '../config/categories';
import { useUserData } from '../context/UserDataContext';
import { ToggleRow } from '../components/ui';
import { PREFS } from './AccountPage';

const AREAS = ['Shoreditch', 'Soho', 'Clerkenwell', 'Islington', 'Marylebone', 'Hackney'];
const TITLES = ['What are you into?', 'Where should we look?', 'Stay in the loop'];
const SUBS = ['Pick a few — we’ll put them first.', 'We’ll show venues and slots near here.', 'Choose how we keep you posted.'];

/** Shown after sign-up: interests, area, notifications. */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { extras, updateExtras } = useUserData();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>(extras.interests);
  const [area, setArea] = useState(extras.homeArea);
  const [locMsg, setLocMsg] = useState('');

  const finish = () => {
    updateExtras({ interests, homeArea: area.trim() });
    navigate(area.trim() ? `/search?area=${encodeURIComponent(area.trim())}` : '/');
  };

  const useLocation = () => {
    if (!navigator.geolocation) return setLocMsg('Location isn’t available in this browser.');
    setLocMsg('Finding you…');
    navigator.geolocation.getCurrentPosition(
      // TODO(maps): reverse-geocode to a postcode with the map provider.
      () => {
        setArea('Near me');
        setLocMsg('');
      },
      () => setLocMsg('We couldn’t get your location — type a postcode instead.'),
    );
  };

  return (
    <div className="wrap w780 page">
      <div className="between" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ height: 8, width: i === step ? 28 : 8, borderRadius: 999, background: i <= step ? 'var(--teal)' : 'var(--off)', transition: 'width .2s' }} />
          ))}
        </div>
        <button className="btn-back" style={{ padding: '10px 0' }} onClick={finish}>
          Skip
        </button>
      </div>
      <h1 className="display" style={{ fontWeight: 800, fontSize: 'clamp(36px,6vw,64px)', letterSpacing: '-.035em', lineHeight: 0.95, margin: 0 }}>
        {TITLES[step]}
      </h1>
      <p className="muted" style={{ fontSize: 17, margin: '12px 0 28px' }}>{SUBS[step]}</p>

      {step === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(46%,160px),1fr))', gap: 12 }}>
          {categories.map((c) => {
            const on = interests.includes(c.id);
            return (
              <button
                key={c.id}
                aria-pressed={on}
                onClick={() => setInterests(on ? interests.filter((x) => x !== c.id) : [...interests, c.id])}
                style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 20, overflow: 'hidden', border: `3px solid ${on ? 'var(--teal)' : 'transparent'}`, padding: 0, background: 'var(--ink)' }}
              >
                <img src={c.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                <span style={{ position: 'absolute', inset: 'auto 0 0 0', padding: 12, background: 'linear-gradient(to top,rgba(8,14,12,.75),transparent)', color: '#fff', fontWeight: 700, fontSize: 15, textAlign: 'left' }}>{c.name}</span>
                <span style={{ position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: '50%', background: on ? 'var(--teal)' : 'rgba(255,255,255,.85)', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on ? '✓' : ''}</span>
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <>
          <input className="input h56" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Postcode or area" style={{ borderRadius: 14, padding: '0 18px', fontSize: 17 }} />
          <button className="btn btn-outline btn-sm h48" style={{ marginTop: 10, fontSize: 15, color: 'var(--teal)' }} onClick={useLocation}>
            Use my current location
          </button>
          {locMsg && <div className="muted" style={{ fontSize: 14, marginTop: 8 }}>{locMsg}</div>}
          <div className="label" style={{ margin: '28px 0 10px' }}>Popular areas</div>
          <div className="row" style={{ gap: 8 }}>
            {AREAS.map((a) => (
              <button key={a} className={`chip${area === a ? ' on' : ''}`} style={{ padding: '11px 18px', fontSize: 15 }} onClick={() => setArea(a)}>
                {a}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <div className="card" style={{ padding: '6px 20px' }}>
          {PREFS.map(([k, label, desc], i) => (
            <ToggleRow key={k} label={label} desc={desc} on={extras.prefs[k]} last={i === PREFS.length - 1} onToggle={() => updateExtras({ prefs: { ...extras.prefs, [k]: !extras.prefs[k] } })} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
        {step > 0 && (
          <button className="btn btn-outline h56" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        <button className="btn btn-teal h56 btn-bold" style={{ flex: 1 }} onClick={() => (step < 2 ? setStep(step + 1) : finish())}>
          {step < 2 ? 'Continue' : 'Start exploring'}
        </button>
      </div>
    </div>
  );
}
