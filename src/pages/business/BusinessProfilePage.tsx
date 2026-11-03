import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BusinessNav from '../../components/BusinessNav';
import { Spinner } from '../../components/ui';
import { fetchVenueProfile, saveVenueProfile, type VenueProfileForm } from '../../services/business';

const EMPTY: VenueProfileForm = {
  shopName: '',
  bio: '',
  phone: '',
  addressLine1: '',
  city: '',
  region: '',
  allowPayAtVenue: false,
  depositPercent: 0,
};

export default function BusinessProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<VenueProfileForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchVenueProfile(user.id)
      .then(({ profile }) => setForm(profile))
      .catch((e) => setMsg(e?.message ?? 'Could not load profile'))
      .finally(() => setLoading(false));
  }, [user]);

  const set = (k: keyof VenueProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setMsg('');
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    setMsg('');
    try {
      await saveVenueProfile(user.id, form);
      setMsg('Saved');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap w880 page">
      <BusinessNav />
      {loading ? (
        <Spinner />
      ) : (
        <div className="card card-pad-lg">
          <h2 className="h-card" style={{ marginBottom: 16 }}>Venue profile</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,240px),1fr))', gap: 14 }}>
            <label className="field">
              Venue name
              <input className="input h50" value={form.shopName} onChange={set('shopName')} />
            </label>
            <label className="field">
              Phone
              <input className="input h50" type="tel" value={form.phone} placeholder="020…" onChange={set('phone')} />
            </label>
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              About
              <textarea className="input" rows={3} value={form.bio} placeholder="Tell customers about your venue" onChange={set('bio')} />
            </label>
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              Address
              <input className="input h50" value={form.addressLine1} placeholder="12 High Street" onChange={set('addressLine1')} />
            </label>
            <label className="field">
              City
              <input className="input h50" value={form.city} placeholder="London" onChange={set('city')} />
            </label>
            <label className="field">
              Region
              <input className="input h50" value={form.region} placeholder="Greater London" onChange={set('region')} />
            </label>
          </div>

          <h3 className="label" style={{ marginTop: 22, marginBottom: 10 }}>Payments</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,240px),1fr))', gap: 14 }}>
            <label className="field">
              Deposit at booking (%)
              <input
                className="input h50"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={form.depositPercent || ''}
                placeholder="0 = no deposit option"
                onChange={(e) => setForm((f) => ({ ...f, depositPercent: Number(e.target.value) || 0 }))}
              />
            </label>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'end', minHeight: 50 }}>
              <input
                type="checkbox"
                checked={form.allowPayAtVenue}
                onChange={(e) => setForm((f) => ({ ...f, allowPayAtVenue: e.target.checked }))}
              />
              Let customers pay at the venue
            </label>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            Customers can always pay in full when they book. A customer who cancels within 24 hours
            doesn’t get the deposit back.
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn btn-teal btn-sm h48 btn-bold" style={{ fontSize: 15, padding: '0 22px' }} disabled={busy} onClick={save}>
              {busy ? 'Saving…' : 'Save profile'}
            </button>
            <span className="ok-msg">{msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
