import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileToAvatarDataUrl } from '../utils/files';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { useInbox } from '../hooks/useInbox';
import { giftBalance } from '../services/stubs';
import { LoginGate, Spinner, ToggleRow } from '../components/ui';
import { displayStatus, isUpcoming } from '../utils/booking';
import { authErrorMessage } from '../utils/authError';
import { money } from '../utils/format';

export const PREFS: ['remind' | 'sms' | 'offers', string, string][] = [
  ['remind', 'Appointment reminders', 'Email the day before'],
  ['sms', 'Text updates', 'If a venue runs late or changes your slot'],
  ['offers', 'Offers & news', 'Occasional deals from venues you’ve visited'],
];

export default function AccountPage() {
  const { user, loading, updateProfile, signOut } = useAuth();
  const { extras, updateExtras, bookings } = useUserData();
  const { unreadCount } = useInbox();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.displayName);
      setEmail(user.email);
    }
  }, [user]);
  useEffect(() => {
    setPhone(extras.phone);
  }, [extras.phone]);

  if (loading) return <Spinner />;
  if (!user)
    return (
      <div className="wrap w880 page">
        <LoginGate title="Your account" text="Log in to manage your details and preferences." />
      </div>
    );

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      const { emailPending } = await updateProfile({ displayName: name.trim() || user.displayName, email: email.trim() });
      updateExtras({ phone: phone.trim() });
      setMsg(emailPending ? `Saved · confirm the link we sent to ${email.trim()}` : 'Saved');
    } catch (e) {
      const code = (e as { code?: string }).code;
      setMsg(code === 'auth/requires-recent-login' ? 'Log out and back in to change your email.' : authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const pickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    setMsg('');
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await updateProfile({ avatar: dataUrl });
      setMsg('Photo updated');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not update photo');
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    setMsg('');
    try {
      await updateProfile({ avatar: '' });
      setMsg('Photo removed');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not remove photo');
    } finally {
      setAvatarBusy(false);
    }
  };

  const upcoming = bookings.filter(isUpcoming).length;
  const completed = bookings.filter((b) => displayStatus(b) === 'completed').length;
  const link = (label: string, right: string, to: string, last = false) => (
    <button
      onClick={() => navigate(to)}
      className="between"
      style={{ flexWrap: 'nowrap', padding: '16px 0', border: 0, borderBottom: last ? 0 : '1px solid var(--hair)', background: 'none', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}
    >
      {label}
      <span className="muted" style={{ fontWeight: 500 }}>{right}</span>
    </button>
  );

  return (
    <div className="wrap w880 page">
      <div className="row" style={{ gap: 18, marginBottom: 28 }}>
        <button
          type="button"
          className="avatar-edit"
          onClick={() => fileRef.current?.click()}
          disabled={avatarBusy}
          title="Change photo"
          aria-label="Change profile photo"
        >
          {user.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            <span className="display">{user.displayName[0]?.toUpperCase()}</span>
          )}
          <span className="avatar-cam" aria-hidden="true">{avatarBusy ? '…' : '📷'}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
        <div style={{ flex: '1 1 200px' }}>
          <h1 className="display" style={{ fontWeight: 800, fontSize: 'clamp(30px,5vw,44px)', letterSpacing: '-.03em', margin: 0, lineHeight: 1 }}>
            {user.displayName}
          </h1>
          <div className="muted" style={{ fontSize: 15, marginTop: 6 }}>
            {upcoming} upcoming · {completed} completed · {user.email}
          </div>
          {user.avatar && (
            <button type="button" className="btn-text" style={{ fontSize: 13, marginTop: 6 }} disabled={avatarBusy} onClick={removeAvatar}>
              Remove photo
            </button>
          )}
        </div>
      </div>

      <div className="card card-pad-lg" style={{ marginBottom: 16 }}>
        <h2 className="h-card" style={{ marginBottom: 16 }}>Your details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,240px),1fr))', gap: 14 }}>
          <label className="field">
            Name
            <input className="input h50" value={name} onChange={(e) => { setName(e.target.value); setMsg(''); }} autoComplete="name" />
          </label>
          <label className="field">
            Email
            <input className="input h50" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setMsg(''); }} autoComplete="email" />
          </label>
          <label className="field">
            Mobile
            <input className="input h50" type="tel" value={phone} placeholder="07…" onChange={(e) => { setPhone(e.target.value); setMsg(''); }} autoComplete="tel" />
          </label>
        </div>
        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn btn-teal btn-sm h48 btn-bold" style={{ fontSize: 15, padding: '0 22px' }} disabled={busy} onClick={save}>
            Save changes
          </button>
          <span className="ok-msg">{msg}</span>
        </div>
      </div>

      <div className="card card-pad-lg" style={{ marginBottom: 16 }}>
        <h2 className="h-card" style={{ marginBottom: 6 }}>Notifications</h2>
        {PREFS.map(([k, label, desc], i) => (
          <ToggleRow key={k} label={label} desc={desc} on={extras.prefs[k]} last={i === PREFS.length - 1} onToggle={() => updateExtras({ prefs: { ...extras.prefs, [k]: !extras.prefs[k] } })} />
        ))}
      </div>

      <div className="card" style={{ padding: '6px clamp(18px,3vw,28px)', marginBottom: 16, display: 'flex', flexDirection: 'column' }}>
        {link('Saved venues', `${extras.savedVenueIds.length} saved ›`, '/saved')}
        {link('Inbox', `${unreadCount} unread ›`, '/inbox')}
        {link('Gift cards', 'Buy or redeem ›', '/gift')}
        {link('Payment & receipts', `${money(giftBalance(user.id))} credit ›`, '/account/payments')}
        {link('Privacy & data', '›', '/account/privacy')}
        {link('Help & cancellation policy', '›', '/help', true)}
      </div>

      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-outline h52" style={{ flex: '1 1 200px', fontSize: 15 }} onClick={() => navigate('/appointments')}>
          My bookings
        </button>
        <button className="btn btn-danger-soft h52" style={{ flex: '1 1 200px', fontSize: 15 }} onClick={doSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
