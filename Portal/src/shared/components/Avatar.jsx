/**
 * Gradient initials avatar. Pass `name` or `initials`. Size variants via prop.
 */
const sizeMap = {
  xs: '!w-7 !h-7 !text-[10px]',
  sm: '!w-8 !h-8 !text-[11px]',
  md: '',           // default 2.5rem
  lg: '!w-12 !h-12 !text-base',
};

const computeInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?';

const Avatar = ({ name, initials, size = 'md', className = '' }) => {
  const label = initials || computeInitials(name);
  return (
    <div className={`supplier-card-avatar ${sizeMap[size] || ''} ${className}`}>
      {label}
    </div>
  );
};

export default Avatar;
