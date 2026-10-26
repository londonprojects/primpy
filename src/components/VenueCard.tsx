import { Link } from 'react-router-dom';
import type { Venue } from '../types';
import { categoryById } from '../config/categories';
import StarRating from './StarRating';

export default function VenueCard({ venue }: { venue: Venue }) {
  const fromPrice = venue.treatments.length
    ? Math.min(...venue.treatments.map((t) => t.price).filter((p) => p > 0))
    : 0;

  return (
    <Link to={`/venue/${venue.id}`} className="venue-card">
      <div className="thumb">
        <img src={venue.image} alt={venue.name} loading="lazy" />
      </div>
      <div className="body">
        <h3>{venue.name}</h3>
        <div className="meta">{venue.address}</div>
        <StarRating rating={venue.rating} count={venue.totalReviews} />
        <div className="chips">
          {venue.categories.slice(0, 3).map((c) => (
            <span key={c} className="chip">
              {categoryById(c)?.name ?? c}
            </span>
          ))}
        </div>
        {fromPrice > 0 && (
          <div className="meta" style={{ marginTop: 'auto', paddingTop: 8 }}>
            From <strong>£{fromPrice}</strong>
          </div>
        )}
      </div>
    </Link>
  );
}
