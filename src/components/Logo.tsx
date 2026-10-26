import type { CSSProperties } from 'react';

export default function Logo({
  size = 28,
  onClick,
  style,
}: {
  size?: number;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="logo" onClick={onClick} style={{ fontSize: size, ...style }} aria-label="Primpy home">
      primpy<span>.</span>
    </Tag>
  );
}
