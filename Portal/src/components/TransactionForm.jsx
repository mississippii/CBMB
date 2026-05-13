import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';

const TransactionForm = ({ onClose, entryMode = 'both' }) => {
  const { suppliers, customers, supplierProducts, recordSale, recordAccountTransaction } = useData();

  const [entryType, setEntryType] = useState(entryMode === 'payment' ? 'payment' : 'sale');
  const [saleForm, setSaleForm] = useState({
    supplierId: '',
    customerId: '',
    productId: '',
    quantity: '',
    unitPrice: '',
    paymentType: 'Due',
    paymentAmount: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    partyType: 'customer',
    partyId: '',
    paymentType: 'Cash',
    amount: '',
    woodenReturn: '',
    plasticReturn: '',
    boxJamanotChange: '',
    note: '',
  });
  const [oneTimeCustomer, setOneTimeCustomer] = useState({ name: '', phone: '' });
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const isPaymentOnly = entryMode === 'payment';
  const isSaleOnly = entryMode === 'sale';
  const showEntryTypeTabs = entryMode === 'both';
  const showingPaymentForm = isPaymentOnly || (!isSaleOnly && entryType === 'payment');

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === Number(saleForm.customerId)),
    [customers, saleForm.customerId],
  );

  const availableProducts = useMemo(() => {
    const supplierId = Number(saleForm.supplierId);
    if (!supplierId) return [];
    return supplierProducts.filter((product) => product.supplierId === supplierId && product.quantity > 0);
  }, [supplierProducts, saleForm.supplierId]);

  const selectedProduct = useMemo(
    () => availableProducts.find((product) => product.id === Number(saleForm.productId)),
    [availableProducts, saleForm.productId],
  );

  const paymentEntities = useMemo(
    () => (paymentForm.partyType === 'customer' ? customers : suppliers),
    [paymentForm.partyType, customers, suppliers],
  );

  const quantity = Number(saleForm.quantity) || 0;
  const unitPrice = Number(saleForm.unitPrice) || 0;
  const salePaymentAmount = Number(saleForm.paymentAmount) || 0;
  const totalAmount = Math.max(0, quantity * unitPrice);
  const previousDue = selectedCustomer ? Number(selectedCustomer.amountDue || 0) : 0;
  const totalPayable = previousDue + totalAmount;
  const dueAfterPayment = Math.max(totalPayable - (saleForm.paymentType === 'Cash' ? salePaymentAmount : 0), 0);

  const resetSaleForm = () => {
    setSaleForm({
      supplierId: '',
      customerId: '',
      productId: '',
      quantity: '',
      unitPrice: '',
      paymentType: 'Due',
      paymentAmount: '',
    });
    setOneTimeCustomer({ name: '', phone: '' });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      partyType: 'customer',
      partyId: '',
      paymentType: 'Cash',
      amount: '',
      woodenReturn: '',
      plasticReturn: '',
      boxJamanotChange: '',
      note: '',
    });
  };

  const handleSaleSubmit = (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    if (saleForm.paymentType === 'Cash' && salePaymentAmount <= 0) {
      setFeedback({ type: 'error', message: 'For cash sale, enter payment amount.' });
      return;
    }

    try {
      const transaction = recordSale({
        supplierId: Number(saleForm.supplierId),
        customerId: Number(saleForm.customerId),
        productId: Number(saleForm.productId),
        quantity: Number(saleForm.quantity),
        unitPrice: Number(saleForm.unitPrice),
        paymentAmount: saleForm.paymentType === 'Cash' ? salePaymentAmount : 0,
        customerName: saleForm.customerId === 'ONE_TIME' ? oneTimeCustomer.name : undefined,
        customerPhone: saleForm.customerId === 'ONE_TIME' ? oneTimeCustomer.phone : undefined,
      });

      setFeedback({
        type: 'success',
        message: `Sale recorded (TX-${transaction.id}). Customer due is now ৳${transaction.customerNewDue.toLocaleString()}.`,
      });
      resetSaleForm();
      if (onClose) {
        setTimeout(() => onClose(), 900);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to record sale.',
      });
    }
  };

  const handlePaymentSubmit = (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      const transaction = recordAccountTransaction({
        ...paymentForm,
        amount: Number(paymentForm.amount || 0),
        woodenReturn: Number(paymentForm.woodenReturn || 0),
        plasticReturn: Number(paymentForm.plasticReturn || 0),
        boxJamanotChange: Number(paymentForm.boxJamanotChange || 0),
      });

      setFeedback({
        type: 'success',
        message: `${transaction.partyType} transaction recorded (TX-${transaction.id}).`,
      });
      resetPaymentForm();
      if (onClose) {
        setTimeout(() => onClose(), 900);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to record payment transaction.',
      });
    }
  };

  const handleSupplierChange = (supplierId) => {
    setSaleForm((prev) => ({
      ...prev,
      supplierId,
      productId: '',
      unitPrice: '',
      quantity: '',
    }));
  };

  const handleProductChange = (productId) => {
    const product = availableProducts.find((item) => item.id === Number(productId));
    setSaleForm((prev) => ({
      ...prev,
      productId,
      unitPrice: product ? String(product.unitPrice) : '',
    }));
  };

  return (
    <div className="space-y-4">
      {showEntryTypeTabs && (
        <div className="tabs-container mb-0">
          <button
            type="button"
            onClick={() => setEntryType('sale')}
            className={`tab-button ${entryType === 'sale' ? 'active' : ''}`}
          >
            🛒 Sale Entry
          </button>
          <button
            type="button"
            onClick={() => setEntryType('payment')}
            className={`tab-button ${entryType === 'payment' ? 'active' : ''}`}
          >
            💳 Payment / Due / Box Update
          </button>
        </div>
      )}

      {feedback.message && (
        <div className={feedback.type === 'error' ? 'status-error' : 'status-success'}>
          <span>{feedback.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {!showingPaymentForm ? (
        <form onSubmit={handleSaleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>🚜 Supplier</label>
              <select
                value={saleForm.supplierId}
                onChange={(event) => handleSupplierChange(event.target.value)}
                className="input-field"
                required
              >
                <option value="">Choose supplier...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>👥 Customer</label>
              <select
                value={saleForm.customerId}
                onChange={(event) =>
                  setSaleForm((prev) => ({
                    ...prev,
                    customerId: event.target.value,
                  }))
                }
                className="input-field"
                required
              >
                <option value="">Choose customer...</option>
                <option value="ONE_TIME">One-time customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {saleForm.customerId === 'ONE_TIME' && (
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={oneTimeCustomer.name}
                onChange={(event) =>
                  setOneTimeCustomer((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Customer Name"
                className="input-field"
                required
              />
              <input
                type="tel"
                value={oneTimeCustomer.phone}
                onChange={(event) =>
                  setOneTimeCustomer((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder="Phone Number"
                className="input-field"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label>📦 Product</label>
              <select
                value={saleForm.productId}
                onChange={(event) => handleProductChange(event.target.value)}
                className="input-field"
                disabled={!saleForm.supplierId}
                required
              >
                <option value="">
                  {saleForm.supplierId ? 'Choose product...' : 'Select supplier first'}
                </option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.productName} ({product.category}) • stock: {product.quantity}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>🔢 Quantity</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={saleForm.quantity}
                onChange={(event) =>
                  setSaleForm((prev) => ({ ...prev, quantity: event.target.value }))
                }
                className="input-field"
                required
              />
            </div>
            <div>
              <label>💲 Unit Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={saleForm.unitPrice}
                onChange={(event) =>
                  setSaleForm((prev) => ({ ...prev, unitPrice: event.target.value }))
                }
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>💳 Payment Type</label>
              <select
                value={saleForm.paymentType}
                onChange={(event) =>
                  setSaleForm((prev) => ({
                    ...prev,
                    paymentType: event.target.value,
                    paymentAmount: event.target.value === 'Due' ? '' : prev.paymentAmount,
                  }))
                }
                className="input-field"
                required
              >
                <option value="Due">Due</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div>
              <label>💵 Payment Received</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={saleForm.paymentAmount}
                onChange={(event) =>
                  setSaleForm((prev) => ({ ...prev, paymentAmount: event.target.value }))
                }
                placeholder="0"
                className="input-field"
                disabled={saleForm.paymentType === 'Due'}
                required={saleForm.paymentType === 'Cash'}
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Previous customer due</p>
            <p className="font-bold text-gray-900">৳ {previousDue.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2 mb-1">Total payable now</p>
            <p className="font-bold text-indigo-700">৳ {totalPayable.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2 mb-1">Due after this transaction</p>
            <p className="font-bold text-red-600">৳ {dueAfterPayment.toLocaleString()}</p>
          </div>

          {selectedProduct && quantity > selectedProduct.quantity && (
            <div className="status-error">
              <span>⚠️</span>
              <span>
                Quantity exceeds available stock for {selectedProduct.productName}. Available:{' '}
                {selectedProduct.quantity}
              </span>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-600">Total Sale Amount</p>
              <p className="text-2xl font-bold text-green-700">৳ {totalAmount.toLocaleString()}</p>
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={selectedProduct && quantity > selectedProduct.quantity}
            >
              ✅ Record Sale
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>🧾 Party Type</label>
              <select
                value={paymentForm.partyType}
                onChange={(event) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    partyType: event.target.value,
                    partyId: '',
                    boxJamanotChange: event.target.value === 'supplier' ? '' : prev.boxJamanotChange,
                  }))
                }
                className="input-field"
                required
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>
            <div>
              <label>👤 Select {paymentForm.partyType === 'customer' ? 'Customer' : 'Supplier'}</label>
              <select
                value={paymentForm.partyId}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, partyId: event.target.value }))
                }
                className="input-field"
                required
              >
                <option value="">Choose...</option>
                {paymentEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name} ({entity.contact || entity.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>💳 Payment Type</label>
              <select
                value={paymentForm.paymentType}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, paymentType: event.target.value }))
                }
                className="input-field"
                required
              >
                <option value="Cash">Cash</option>
                <option value="Due">Due</option>
              </select>
            </div>
            <div>
              <label>💵 Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
                }
                placeholder="0"
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>📦 Returned Wooden Boxes</label>
              <input
                type="number"
                min="0"
                value={paymentForm.woodenReturn}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, woodenReturn: event.target.value }))
                }
                placeholder="0"
                className="input-field"
              />
            </div>
            <div>
              <label>♻️ Returned Plastic Boxes</label>
              <input
                type="number"
                min="0"
                value={paymentForm.plasticReturn}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, plasticReturn: event.target.value }))
                }
                placeholder="0"
                className="input-field"
              />
            </div>
          </div>

          {paymentForm.partyType === 'customer' && (
            <div>
              <label>💼 Box জামানত Change (+ add / - refund)</label>
              <input
                type="number"
                step="0.01"
                value={paymentForm.boxJamanotChange}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, boxJamanotChange: event.target.value }))
                }
                placeholder="0"
                className="input-field"
              />
            </div>
          )}

          <div>
            <label>📝 Note (optional)</label>
            <input
              type="text"
              value={paymentForm.note}
              onChange={(event) => setPaymentForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Any note about this transaction"
              className="input-field"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between items-center">
            <p className="text-sm text-blue-700">
              This transaction auto-updates selected {paymentForm.partyType} record and box ledger.
            </p>
            <button type="submit" className="btn-primary">
              ✅ Record Payment Transaction
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TransactionForm;
