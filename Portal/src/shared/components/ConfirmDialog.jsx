import { AlertTriangle, Save, X } from 'lucide-react';

/**
 * Shared final-review dialog for submit actions that persist business data.
 */
const ConfirmDialog = ({
  open,
  title = 'Review before saving',
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
      <div className="modal-content overflow-hidden" style={{ maxWidth: '30rem' }} role="alertdialog" aria-modal="true">
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
              <AlertTriangle size={20} strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {message || 'This record will be saved permanently.'}
              </p>
            </div>
            <button type="button" onClick={onCancel} className="modal-close-btn shrink-0" disabled={busy} aria-label="Close confirmation">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-body space-y-3">
          {children ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm shadow-inner shadow-slate-100/60">
              {children}
            </div>
          ) : null}
        </div>

        <div className="modal-footer border-t border-slate-100 bg-white">
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
