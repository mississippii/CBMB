/**
 * Colored pill badge. Variants: emerald, rose, amber, teal, slate (default).
 */
const Badge = ({ tone = 'slate', children, className = '' }) => (
  <span className={`badge badge-${tone} ${className}`}>{children}</span>
);

export default Badge;
