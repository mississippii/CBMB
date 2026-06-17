import { AlertTriangle, Save } from 'lucide-react';

/**
 * Two-step "are you sure" dialog shown on top of a form modal before a final save.
 * Mirrors the Sale/Shipment confirmation pattern so every submission warns first.
 *
 * open        — whether the dialog is visible
 * title       — heading (e.g. "Confirm expense")
 * message     — optional lead sentence; defaults to a generic "cannot be undone" note
 * confirmLabel— primary button text (default "Confirm & Save")
 * busy        — disables buttons + shows "Saving…" while the save is in flight
 * onConfirm   — runs the actual save
 * onCancel    — closes the dialog
 * children    — optional summary rows to review before saving
 */
const ConfirmDialog = ({
  open,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm & Save',
  busy = false,
  onConfirm,
  onCancel,
  children,
}) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal-content" style={{ maxWidth: '26rem' }}>
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div className="modal-icon-circle bg-amber-100 text-amber-700"><AlertTriangle size={18} /></div>
            <div><h2>{title}</h2></div>
          </div>
        </div>
        <div className="px-1 py-1 space-y-3">
          <p className="text-sm text-slate-600">
            {message || (
              <>This action <span className="font-semibold text-slate-800">cannot be undone</span>. Please review before saving.</>
            )}
          </p>
          {children}
        </div>
        <div className="modal-footer">
          <button type="button" onClick={onCancel} className="btn-secondary" disabled={busy}>Back</button>
          <button type="button" onClick={onConfirm} className="btn-primary flex items-center gap-2" disabled={busy}>
            <Save size={15} /> {busy ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
