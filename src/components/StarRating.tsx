export default function StarRating({
  rating,
  count,
}: {
  rating: number;
  count?: number;
}) {
  if (!rating) {
    return <span className="rating subtle">New</span>;
  }
  return (
    <span className="rating">
      <span className="star">★</span>
      {rating.toFixed(1)}
      {count != null && <span className="count">({count})</span>}
    </span>
  );
}
