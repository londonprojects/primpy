import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BusinessNav from '../../components/BusinessNav';
import { Spinner } from '../../components/ui';
import { categories } from '../../config/categories';
import {
  emptyTreatment,
  fetchVenueProfile,
  saveTreatments,
  type TreatmentDraft,
} from '../../services/business';

export default function BusinessTreatmentsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<TreatmentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchVenueProfile(user.id)
      .then(({ treatments }) => setRows(treatments))
      .catch((e) => setMsg(e?.message ?? 'Could not load treatments'))
      .finally(() => setLoading(false));
  }, [user]);

  const update = (id: string, patch: Partial<TreatmentDraft>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setMsg('');
  };
  const remove = (id: string) => { setRows((rs) => rs.filter((r) => r.id !== id)); setMsg(''); };
  const add = () => setRows((rs) => [...rs, emptyTreatment()]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    setMsg('');
    try {
      await saveTreatments(user.id, rows);
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
      <div className="card card-pad-lg">
        <div className="between" style={{ marginBottom: 14 }}>
          <h2 className="h-card" style={{ margin: 0 }}>Treatments</h2>
          <button className="btn btn-outline btn-sm h44" style={{ fontSize: 14 }} onClick={add}>
            + Add treatment
          </button>
        </div>

        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <p className="muted">No treatments yet. Add your first one so customers can book it.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="biz-treatment">
              <label className="field" style={{ flex: '2 1 180px' }}>
                Name
                <input className="input h48" value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} />
              </label>
              <label className="field" style={{ flex: '1 1 130px' }}>
                Category
                <select className="input h48" value={r.category} onChange={(e) => update(r.id, { category: e.target.value })}>
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ width: 80 }}>
                Mins
                <input className="input h48" type="number" min={0} value={r.duration} onChange={(e) => update(r.id, { duration: Number(e.target.value) })} />
              </label>
              <label className="field" style={{ width: 80 }}>
                £
                <input className="input h48" type="number" min={0} value={r.price} onChange={(e) => update(r.id, { price: Number(e.target.value) })} />
              </label>
              <button className="icon-btn" title="Remove" onClick={() => remove(r.id)}>✕</button>
            </div>
          ))
        )}

        {!loading && (
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-teal btn-sm h48 btn-bold" style={{ fontSize: 15, padding: '0 22px' }} disabled={busy} onClick={save}>
              {busy ? 'Saving…' : 'Save treatments'}
            </button>
            <span className="ok-msg">{msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
