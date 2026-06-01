import { useMemo, useState } from 'react';
import {
  CreditCard, User, UserCheck, DollarSign, FileText, Save, ArrowDownRight, ArrowUpRight, Wallet,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';
import { postJson, apiPaths } from '../../services/apiClient';

const fmt = (value) => `৳ ${Math.round(Number(value) || 0).toLocaleString()}`;

// Backend PaymentMethod enum (CASH / BANK / BKASH / NAGAD / OTHER). NONE is for crate-only
// movements, so it isn't offered for a money payment.
const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank' },
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'OTHER', label: 'Other' },
];

// Each direction maps to one backend endpoint + a humane label + which party.
const DIRECTIONS = {
  CUSTOMER_PAY: {
    party: 'customer',
    label: 'Customer pays you',
    desc: 'Customer settles their outstanding due',
    icon: ArrowDownRight,
    endpoint: apiPaths.paymentsCustomerSettle,
    reducesPartyDue: true,
  },
  SUPPLIER_DUE_PAY: {
    party: 'supplier',
    label: 'Pay supplier',
    desc: 'You pay the supplier their outstanding payable',
    icon: ArrowUpRight,
    endpoint: apiPaths.paymentsSupplierProductPay,
    reducesPartyDue: true,
  },
  SUPPLIER_COMMISSION_RECEIVE: {
    party: 'supplier',
    label: 'Receive commission',
    desc: 'Supplier pays you commission',
    icon: ArrowDownRight,
    endpoint: apiPaths.paymentsSupplierCommissionReceive,
    reducesPartyDue: false,
  },
  SUPPLIER_EXPENSE_RECEIVE: {
    party: 'supplier',
    label: 'Receive expense',
    desc: 'Supplier pays back the expense you fronted',
    icon: ArrowDownRight,
    endpoint: apiPaths.paymentsSupplierExpenseReceive,
    reducesPartyDue: false,
  },
};

const PaymentForm = ({ onClose }) => {
  const { admin } = useAuth();
  const { suppliers, customers, reloadSuppliers, reloadCustomers, refreshTransactions } = useData();
  const showToast = useToast();

  const [direction, setDirection] = useState('CUSTOMER_PAY');
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const config = DIRECTIONS[direction];
  const isCustomer = config.party === 'customer';
  const parties = isCustomer ? customers : suppliers;
  const selectedParty = useMemo(
    () => parties.find((p) => p.id === Number(partyId)),
    [parties, partyId],
  );
  const currentDue = selectedParty ? Number(selectedParty.amountDue) || 0 : 0;
  const dueAfter = config.reducesPartyDue
    ? Math.max(0, currentDue - (Number(amount) || 0))
    : currentDue;

  const handleDirectionChange = (next) => {
    const nextParty = DIRECTIONS[next].party;
    setDirection(next);
    if (DIRECTIONS[direction].party !== nextParty) setPartyId('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const amt = Number(amount);
    if (!partyId) { setError(`Choose a ${config.party}.`); return; }
    if (!amt || amt <= 0) { setError('Enter an amount greater than zero.'); return; }
    if (config.reducesPartyDue && amt > currentDue) {
      setError(`Amount cannot exceed the current ${config.party} due (${fmt(currentDue)}).`);
      return;
    }

    setIsSaving(true);
    try {
      const body = isCustomer
        ? {
            wholesalerCustomerId: Number(partyId),
            cashAmount: amt,
            crateReturns: [],
            paymentMethod: method,
            note: note?.trim() || null,
          }
        : {
            wholesalerSupplierId: Number(partyId),
            amount: amt,
            paymentMethod: method,
            note: note?.trim() || null,
          };

      await postJson(config.endpoint(admin.wholesalerId), body);

      showToast('Payment recorded', 'success');
      await Promise.all([
        isCustomer ? reloadCustomers() : reloadSuppliers(),
        refreshTransactions(),
      ]);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <form onSubmit={handleSubmit} className="modal-content" style={{ maxWidth: '36rem' }}>
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div className="modal-icon-circle bg-blue-100 text-blue-700"><CreditCard size={18} /></div>
            <div>
              <h2>Record Payment</h2>
              <p className="text-xs text-slate-500 mt-0.5">Pay or receive money — the party's due adjusts automatically</p>
            </div>
          </div>
          <button type="button" onClick={() => onClose?.()} className="modal-close-btn">✕</button>
        </div>

        <div className="modal-body max-h-[72vh] overflow-y-auto">
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">
                <CreditCard size={13} /> Payment Type <span className="text-red-500">*</span>
              </label>
              <select
                value={direction}
                onChange={(e) => handleDirectionChange(e.target.value)}
                className="input-field"
                required
              >
                {Object.entries(DIRECTIONS).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">{config.desc}</p>
            </div>
            <div className="form-field">
              <label className="form-label">
                {isCustomer ? <User size={13} /> : <UserCheck size={13} />}
                {isCustomer ? 'Customer' : 'Supplier'} <span className="text-red-500">*</span>
              </label>
              <select
                value={partyId}
                onChange={(e) => { setPartyId(e.target.value); setError(''); }}
                className="input-field"
                required
                autoFocus
              >
                <option value="">Choose {config.party}…</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · due {fmt(p.amountDue || 0)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">
                <DollarSign size={13} /> Amount <span className="text-red-500">*</span>
              </label>
              <div className="input-with-suffix">
                <input
                  type="number" min="0" step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field"
                  placeholder="0"
                  required
                />
                <span className="input-suffix">৳</span>
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">
                <Wallet size={13} /> Method <span className="text-red-500">*</span>
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="input-field"
                required
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field form-field-full">
              <label className="form-label"><FileText size={13} /> Note <span className="form-label-hint">optional</span></label>
              <input
                type="text" value={note} onChange={(e) => setNote(e.target.value)}
                className="input-field"
                placeholder="e.g. Cheque #1234"
              />
            </div>
          </div>

          {/* Compact summary line */}
          {selectedParty && (
            <p className="mt-3 text-xs text-slate-600">
              Current due <strong className="text-slate-900">{fmt(currentDue)}</strong>
              {' · '}This payment <strong className="text-amber-700">{fmt(amount)}</strong>
              {' · '}
              {config.reducesPartyDue ? (
                <>Due after <strong className="text-rose-700">{fmt(dueAfter)}</strong></>
              ) : (
                <span className="text-slate-500">Income to you — party's product due is unchanged</span>
              )}
            </p>
          )}

          {error && (
            <div className="status-error mt-3"><span>!</span><span>{error}</span></div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={() => onClose?.()} className="btn-secondary" disabled={isSaving}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSaving}>
            <Save size={15} /> {isSaving ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
