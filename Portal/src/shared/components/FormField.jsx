/**
 * Standard form field with icon + label + hint + required marker.
 * Wraps any input element via children.
 */
const FormField = ({ icon: Icon, label, required, hint, children, className = '' }) => (
  <div className={`form-field ${className}`}>
    <label className="form-label">
      {Icon && <Icon size={13} />} {label}
      {required && <span className="text-red-500">*</span>}
      {hint && <span className="form-label-hint">{hint}</span>}
    </label>
    {children}
  </div>
);

export default FormField;
