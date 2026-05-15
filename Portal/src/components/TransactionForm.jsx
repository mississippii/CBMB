import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';

const formatCurrency = (value) => `৳ ${(Number(value) || 0).toLocaleString()}`;

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
    paymentMode: 'cash',
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
  const selectedPaymentEntity = useMemo(
    () => paymentEntities.find((entity) => entity.id === Number(paymentForm.partyId)),
    [paymentEntities, paymentForm.partyId],
  );

  const quantity = Number(saleForm.quantity) || 0;
  const unitPrice = Number(saleForm.unitPrice) || 0;
  const salePaymentAmount = Number(saleForm.paymentAmount) || 0;
  const totalAmount = Math.max(0, quantity * unitPrice);
  const previousDue = selectedCustomer ? Number(selectedCustomer.amountDue || 0) : 0;
  const totalPayable = previousDue + totalAmount;
  const dueAfterPayment = Math.max(totalPayable - (saleForm.paymentType === 'Cash' ? salePaymentAmount : 0), 0);
  const paymentDueAmount = Number(paymentForm.amount) || 0;
  const paymentJamanotAmount = Number(paymentForm.boxJamanotChange) || 0;
  const isCashReceive = paymentForm.paymentMode === 'cash';
  const isBoxReceive = paymentForm.paymentMode === 'box';
  const isCashAndBoxReceive = paymentForm.paymentMode === 'both';
  const includesCashReceive = isCashReceive || isCashAndBoxReceive;
  const includesBoxReceive = isBoxReceive || isCashAndBoxReceive;
  const includesJamanotEntry = paymentForm.partyType === 'customer' && (includesCashReceive || includesBoxReceive);
  const selectedCustomerDue =
    paymentForm.partyType === 'customer' ? Number(selectedPaymentEntity?.amountDue || 0) : 0;
  const selectedCustomerJamanot =
    paymentForm.partyType === 'customer' ? Number(selectedPaymentEntity?.boxJamanot || 0) : 0;
  const customerDueAfterPayment =
    paymentForm.partyType === 'customer'
      ? Math.max(selectedCustomerDue - (includesCashReceive ? paymentDueAmount : 0), 0)
      : 0;
  const customerJamanotAfter =
    paymentForm.partyType === 'customer'
      ? Math.max(selectedCustomerJamanot + (includesJamanotEntry ? paymentJamanotAmount : 0), 0)
      : 0;
  const customerCashHandled =
    paymentForm.partyType === 'customer'
      ? (includesCashReceive ? Math.max(paymentDueAmount, 0) : 0) + Math.max(paymentJamanotAmount, 0)
      : 0;
  const returnedBoxes = includesBoxReceive
    ? (Number(paymentForm.woodenReturn) || 0) + (Number(paymentForm.plasticReturn) || 0)
    : 0;
  const selectedSupplierDue =
    paymentForm.partyType === 'supplier' ? Number(selectedPaymentEntity?.amountDue || 0) : 0;
  const supplierDueAfter =
    paymentForm.partyType === 'supplier'
      ? Math.max(selectedSupplierDue - (includesCashReceive ? paymentDueAmount : 0), 0)
      : 0;

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
      paymentMode: 'cash',
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

    if (
      paymentForm.partyType === 'customer' &&
      includesBoxReceive &&
      paymentForm.boxJamanotChange === ''
    ) {
      setFeedback({ type: 'error', message: 'Enter box jamanot value for box receive.' });
      return;
    }

    try {
      const transaction = recordAccountTransaction({
        ...paymentForm,
        paymentType: 'Cash',
        amount: includesCashReceive ? Number(paymentForm.amount || 0) : 0,
        woodenReturn: includesBoxReceive ? Number(paymentForm.woodenReturn || 0) : 0,
        plasticReturn: includesBoxReceive ? Number(paymentForm.plasticReturn || 0) : 0,
        boxJamanotChange: includesJamanotEntry ? Number(paymentForm.boxJamanotChange || 0) : 0,
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
            className={`tab-button flex-1 sm:flex-none justify-center ${entryType === 'sale' ? 'active' : ''}`}
          >
            Sale Entry
          </button>
          <button
            type="button"
            onClick={() => setEntryType('payment')}
            className={`tab-button flex-1 sm:flex-none justify-center ${entryType === 'payment' ? 'active' : ''}`}
          >
            Payment / Due / Box Update
          </button>
        </div>
      )}

      {feedback.message && (
        <div className={feedback.type === 'error' ? 'status-error' : 'status-success'}>
          <span>{feedback.type === 'error' ? '!' : '✓'}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {!showingPaymentForm ? (
        <form onSubmit={handleSaleSubmit} className="space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs font-semibold text-[#307D7E]">
            Record a product sale and auto-update customer due, supplier commission, and stock.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>Supplier</label>
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
              <label>Customer</label>
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
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <label>Product</label>
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
              <label>Quantity</label>
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
              <label>Unit Price</label>
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
              <label>Payment Type</label>
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
              <label>Payment Received</label>
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
            <p className="font-bold text-[#307D7E]">৳ {totalPayable.toLocaleString()}</p>
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

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="text-xs text-gray-600">Total Sale Amount</p>
              <p className="text-2xl font-bold text-green-700">৳ {totalAmount.toLocaleString()}</p>
            </div>
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto"
              disabled={selectedProduct && quantity > selectedProduct.quantity}
            >
              Record Sale
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handlePaymentSubmit} className="payment-workspace">
          <div className="payment-header">
            <div>
              <h3>Payment Settlement</h3>
              <p>Choose cash, box, or both received.</p>
            </div>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>

          <div className="payment-grid">
            <section className="payment-panel">
              <h4>Party</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label>Party Type</label>
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
                  <label>Select {paymentForm.partyType === 'customer' ? 'Customer' : 'Supplier'}</label>
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

              {selectedPaymentEntity && (
                <div className="payment-party-card">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Selected {paymentForm.partyType}
                    </p>
                    <h4>{selectedPaymentEntity.name}</h4>
                    <p>{selectedPaymentEntity.contact || selectedPaymentEntity.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Current Due</p>
                    <strong>
                      {formatCurrency(
                        paymentForm.partyType === 'customer' ? selectedCustomerDue : selectedSupplierDue,
                      )}
                    </strong>
                  </div>
                </div>
              )}
            </section>

            <section className="payment-panel">
              <h4>Receive Type</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label>Payment Mode</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentMode: event.target.value,
                        amount: event.target.value === 'box' ? '' : prev.amount,
                        boxJamanotChange: event.target.value === 'box' ? '' : prev.boxJamanotChange,
                        woodenReturn: event.target.value === 'cash' ? '' : prev.woodenReturn,
                        plasticReturn: event.target.value === 'cash' ? '' : prev.plasticReturn,
                      }))
                    }
                    className="input-field"
                    required
                  >
                    <option value="cash">Cash Receive</option>
                    <option value="box">Box Receive</option>
                    <option value="both">Cash + Box Receive</option>
                  </select>
                </div>
                {includesCashReceive && (
                  <div>
                    <label>{paymentForm.partyType === 'customer' ? 'Due Cash Received' : 'Cash Amount'}</label>
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
                )}
              </div>

              {includesJamanotEntry && (
                <div className="mt-4">
                  <label>
                    Box Jamanot Received / Refund
                    {includesBoxReceive ? ' *' : ''}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.boxJamanotChange}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, boxJamanotChange: event.target.value }))
                    }
                    placeholder="Positive received, negative refund"
                    className="input-field"
                    required={includesBoxReceive}
                  />
                </div>
              )}
            </section>

            {includesBoxReceive && (
              <section className="payment-panel">
                <h4>Box Receive</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label>Wooden Boxes Received</label>
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
                    <label>Plastic Boxes Received</label>
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
              </section>
            )}

            <section className="payment-panel">
              <h4>Note</h4>
              <label>Transaction Note</label>
              <input
                type="text"
                value={paymentForm.note}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Any note about this transaction"
                className="input-field"
              />
            </section>
          </div>

          <div className="payment-summary-grid">
            {paymentForm.partyType === 'customer' ? (
              <>
                <div className="metric-tile">
                  <p>Current Due</p>
                  <strong>{formatCurrency(selectedCustomerDue)}</strong>
                </div>
                <div className="metric-tile danger">
                  <p>Due After</p>
                  <strong>{formatCurrency(customerDueAfterPayment)}</strong>
                </div>
                <div className="metric-tile">
                  <p>Jamanot After</p>
                  <strong>{formatCurrency(customerJamanotAfter)}</strong>
                </div>
                <div className="metric-tile">
                  <p>Cash Received</p>
                  <strong>{formatCurrency(customerCashHandled)}</strong>
                </div>
                {includesBoxReceive && (
                  <div className="metric-tile">
                    <p>Boxes Received</p>
                    <strong>{returnedBoxes}</strong>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="metric-tile">
                  <p>Supplier Due</p>
                  <strong>{formatCurrency(selectedSupplierDue)}</strong>
                </div>
                <div className="metric-tile danger">
                  <p>Due After</p>
                  <strong>{formatCurrency(supplierDueAfter)}</strong>
                </div>
                <div className="metric-tile">
                  <p>Cash Amount</p>
                  <strong>{formatCurrency(includesCashReceive ? paymentDueAmount : 0)}</strong>
                </div>
                {includesBoxReceive && (
                  <div className="metric-tile">
                    <p>Boxes Received</p>
                    <strong>{returnedBoxes}</strong>
                  </div>
                )}
              </>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default TransactionForm;
