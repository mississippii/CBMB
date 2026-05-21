import { X } from 'lucide-react';

/**
 * Reusable modal shell. Compose with ModalHeader / ModalBody / ModalFooter,
 * or pass title/onClose for the simple case.
 */
const Modal = ({ open, onClose, title, subtitle, icon: Icon, iconClass = '', maxWidth = '32rem', children, footer }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal-content" style={{ maxWidth }}>
        {(title || onClose) && (
          <div className="modal-header">
            <div className="flex items-center gap-2.5 min-w-0">
              {Icon && (
                <div className={`modal-icon-circle ${iconClass}`}>
                  <Icon size={18} />
                </div>
              )}
              <div className="min-w-0">
                {title && <h2>{title}</h2>}
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="modal-close-btn" aria-label="Close">
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
