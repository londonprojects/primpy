import { useNavigate } from 'react-router-dom';
import { useUserData } from '../context/UserDataContext';
import { useVenues } from '../hooks/useVenues';
import { SlotCard } from '../components/VenueCards';
import { CardSkeleton, Empty } from '../components/ui';

export default function SavedPage() {
  const navigate = useNavigate();
  const { extras } = useUserData();
  const { venues, loading } = useVenues();
  const saved = venues.filter((v) => extras.savedVenueIds.includes(v.id));
  const count = loading ? extras.savedVenueIds.length : saved.length;

  return (
    <div className="wrap page">
      <h1 className="h-page" style={{ marginBottom: 6 }}>Saved</h1>
      <p className="muted" style={{ margin: '0 0 24px', fontSize: 16 }}>
        {count} saved · tap ♥ on any venue to add it here.
      </p>
      {!loading && saved.length === 0 ? (
        <Empty title="No saved venues yet" text="Save places you love so they're one tap away next time." cta="Explore venues" onCta={() => navigate('/search')} />
      ) : (
        <div className="grid-cards">
          {loading
            ? extras.savedVenueIds.map((id) => <CardSkeleton key={id} />)
            : saved.map((v) => <SlotCard key={v.id} venue={v} ratingInMeta />)}
        </div>
      )}
    </div>
  );
}
