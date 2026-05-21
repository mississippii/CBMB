const EmptyState = ({ icon: Icon, title, sub, action, className = '' }) => (
  <div className={`empty-state ${className}`}>
    {Icon && <Icon size={36} className="empty-state-icon" />}
    {title && <p className="empty-state-title">{title}</p>}
    {sub && <p className="empty-state-sub">{sub}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export default EmptyState;
