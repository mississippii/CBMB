/**
 * Compact KPI tile with colored icon, label, and value.
 * Tone variants: default, emerald, teal, amber, rose.
 */
const KPITile = ({ icon: Icon, label, value, tone = 'default' }) => (
  <div className={`kpi-tile kpi-tile-${tone}`}>
    {Icon && (
      <div className="kpi-tile-icon">
        <Icon size={18} />
      </div>
    )}
    <div className="kpi-tile-body">
      <p className="kpi-tile-label">{label}</p>
      <strong className="kpi-tile-value">{value}</strong>
    </div>
  </div>
);

export default KPITile;
