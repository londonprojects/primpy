export default function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="center-state">
      <div className="spinner" />
      {label}
    </div>
  );
}
