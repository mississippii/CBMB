import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';

const formatCurrency = (value) => `৳ ${(Number(value) || 0).toLocaleString()}`;

const TransactionForm = ({ onClose, entryMode = 'both' }) => {
  const { suppliers, customers, supplierProducts, boxInventory, recordSale, recordAccountTransaction } = useData();

  const [entryType, setEntryType] = useState(entryMode === 'payment' ? 'payment' : 'sale');
  const [saleForm, setSaleForm] = useState({
    supplierId: '',
    customerId: '',
    productId: '',
    quantity: '',
    unitPrice: '',
    paymentType: 'FULL_DUE',
    paymentAmount: '',
    banglaCratesGiven: '',
    chinaCratesGiven: '',
    jamanotAmount: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    partyType: 'customer',
    partyId: '',
    paymentMode: 'cash',
    paymentType: 'Cash',
    supplierPaymentKind: 'PRODUCT_PAYMENT',
    supplierCrateDirection: 'return',
    amount: '',
    woodenReturn: '',
    plasticReturn: '',
    boxJamanotChange: '',
    note: '',
  });
  const [oneTimeCustomer, setOneTimeCustomer] = useState({ name: '', phone: '' });
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    if (feedback.type !== 'success') return undefined;
    const timer = window.setTimeout(() => setFeedback({ type: '', message: '' }), 1500);
    return () => window.clearTimeout(timer);
  }, [feedback.type]);

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
  const totalAmount = Math.max(0, quantity * unitPrice);
  const isOneTimeCustomer = saleForm.customerId === 'ONE_TIME';
  const isCrateSale = !isOneTimeCustomer && selectedProduct?.unit === 'box';
  const banglaCratesGiven = isCrateSale ? Math.max(0, Math.floor(Number(saleForm.banglaCratesGiven) || 0)) : 0;
  const chinaCratesGiven = isCrateSale ? Math.max(0, Math.floor(Number(saleForm.chinaCratesGiven) || 0)) : 0;
  const cratesGiven = banglaCratesGiven + chinaCratesGiven;
  const jamanotAmount = isCrateSale ? Number(saleForm.jamanotAmount) || 0 : 0;
  const previousDue = selectedCustomer ? Number(selectedCustomer.amountDue || 0) : 0;
  const totalPayable = previousDue + totalAmount;
  const salePaymentAmount = isOneTimeCustomer
    ? totalAmount
    : saleForm.paymentType === 'FULL_PAY'
      ? totalPayable
      : saleForm.paymentType === 'PARTIAL_PAY'
        ? Number(saleForm.paymentAmount) || 0
        : 0;
  const paymentDueAmount = Number(paymentForm.amount) || 0;
  const paymentJamanotAmount = Number(paymentForm.boxJamanotChange) || 0;
  const isSupplierParty = paymentForm.partyType === 'supplier';
  const isCashReceive = paymentForm.paymentMode === 'cash';
  const isSupplierDuePay = paymentForm.paymentMode === 'supplier_due_pay';
  const isSupplierCommissionReceive = paymentForm.paymentMode === 'supplier_commission_receive';
  const isSupplierExpenseReceive = paymentForm.paymentMode === 'supplier_expense_receive';
  const isSupplierBoxBorrow = paymentForm.paymentMode === 'supplier_box_borrow';
  const isBoxReceive = paymentForm.paymentMode === 'box';
  const isSupplierMoneyMode = isSupplierDuePay || isSupplierCommissionReceive || isSupplierExpenseReceive;
  const includesCashReceive = isSupplierParty ? isSupplierMoneyMode : isCashReceive;
  const includesBoxReceive = isSupplierParty ? isBoxReceive || isSupplierBoxBorrow : isBoxReceive;
  const includesJamanotEntry = paymentForm.partyType === 'customer' && includesBoxReceive;
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
      ? Math.max(selectedCustomerJamanot - (includesJamanotEntry ? paymentJamanotAmount : 0), 0)
      : 0;
  const customerCashHandled =
    paymentForm.partyType === 'customer'
      ? (includesCashReceive ? Math.max(paymentDueAmount, 0) : 0)
      : 0;
  const returnedBoxes = includesBoxReceive
    ? (Number(paymentForm.woodenReturn) || 0) + (Number(paymentForm.plasticReturn) || 0)
    : 0;
  const selectedSupplierDue =
    paymentForm.partyType === 'supplier' ? Number(selectedPaymentEntity?.amountDue || 0) : 0;
  const supplierDueAfter =
    paymentForm.partyType === 'supplier'
      ? Math.max(selectedSupplierDue - (isSupplierDuePay ? paymentDueAmount : 0), 0)
      : 0;

  const resetSaleForm = () => {
    setSaleForm({
      supplierId: '',
      customerId: '',
      productId: '',
      quantity: '',
      unitPrice: '',
      paymentType: 'FULL_DUE',
      paymentAmount: '',
      banglaCratesGiven: '',
      chinaCratesGiven: '',
      jamanotAmount: '',
    });
    setOneTimeCustomer({ name: '', phone: '' });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      partyType: 'customer',
      partyId: '',
      paymentMode: 'cash',
      paymentType: 'Cash',
      supplierPaymentKind: 'PRODUCT_PAYMENT',
      supplierCrateDirection: 'return',
      amount: '',
      woodenReturn: '',
      plasticReturn: '',
      boxJamanotChange: '',
      note: '',
    });
  };

  const handleSaleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    if (isOneTimeCustomer && salePaymentAmount !== totalAmount) {
      setFeedback({ type: 'error', message: 'One-time customer must pay the full sale amount.' });
      return;
    }
    if (saleForm.paymentType === 'PARTIAL_PAY' && salePaymentAmount <= 0) {
      setFeedback({ type: 'error', message: 'Enter partial payment amount.' });
      return;
    }
    if (saleForm.paymentType === 'PARTIAL_PAY' && salePaymentAmount >= totalPayable) {
      setFeedback({ type: 'error', message: 'Partial payment must be less than total payable.' });
      return;
    }
    if (salePaymentAmount > totalPayable) {
      setFeedback({ type: 'error', message: 'Payment received cannot exceed total payable.' });
      return;
    }
    if (isCrateSale && (!Number.isInteger(quantity) || quantity <= 0)) {
      setFeedback({ type: 'error', message: 'Crate sale quantity must be a whole number.' });
      return;
    }
    if (isCrateSale && cratesGiven !== quantity) {
      setFeedback({ type: 'error', message: 'Bangla and China crates must equal sold crate quantity.' });
      return;
    }
    if (isCrateSale && jamanotAmount < 0) {
      setFeedback({ type: 'error', message: 'Jamanot amount cannot be negative.' });
      return;
    }
    if (isCrateSale && banglaCratesGiven > Number(boxInventory.bangla?.inShop || 0)) {
      setFeedback({ type: 'error', message: 'Not enough Bangla crates in shop for this sale.' });
      return;
    }
    if (isCrateSale && chinaCratesGiven > Number(boxInventory.china?.inShop || 0)) {
      setFeedback({ type: 'error', message: 'Not enough China crates in shop for this sale.' });
      return;
    }

    try {
      const transaction = await recordSale({
        supplierId: Number(saleForm.supplierId),
        customerId: Number(saleForm.customerId),
        productId: Number(saleForm.productId),
        quantity: Number(saleForm.quantity),
        unitPrice: Number(saleForm.unitPrice),
        paymentAmount: salePaymentAmount,
        cratesGiven: isCrateSale ? cratesGiven : 0,
        banglaCratesGiven: isCrateSale ? banglaCratesGiven : 0,
        chinaCratesGiven: isCrateSale ? chinaCratesGiven : 0,
        jamanotAmount: isCrateSale ? jamanotAmount : 0,
        customerName: saleForm.customerId === 'ONE_TIME' ? oneTimeCustomer.name : undefined,
        customerPhone: saleForm.customerId === 'ONE_TIME' ? oneTimeCustomer.phone : undefined,
      });

      setFeedback({ type: 'success', message: '' });
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

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    if (
      paymentForm.partyType === 'customer' &&
      includesBoxReceive &&
      paymentForm.boxJamanotChange === ''
    ) {
      setFeedback({ type: 'error', message: 'Enter jamanot value for crate receive.' });
      return;
    }
    if (paymentForm.partyType === 'customer' && includesCashReceive && paymentDueAmount > selectedCustomerDue) {
      setFeedback({ type: 'error', message: 'Cash received cannot exceed customer due.' });
      return;
    }
    if (paymentForm.partyType === 'customer' && includesBoxReceive && paymentJamanotAmount > selectedCustomerJamanot) {
      setFeedback({ type: 'error', message: 'Jamanot refund cannot exceed customer jamanot balance.' });
      return;
    }
    if (paymentForm.partyType === 'supplier' && includesCashReceive && paymentDueAmount <= 0) {
      setFeedback({ type: 'error', message: 'Enter supplier cash amount.' });
      return;
    }
    if (
      paymentForm.partyType === 'supplier' &&
      includesCashReceive &&
      isSupplierDuePay &&
      paymentDueAmount > selectedSupplierDue
    ) {
      setFeedback({ type: 'error', message: 'Supplier due payment cannot exceed payable amount.' });
      return;
    }
    if (
      paymentForm.partyType === 'supplier' &&
      includesBoxReceive &&
      isSupplierBoxBorrow &&
      ((Number(paymentForm.woodenReturn) || 0) > Number(boxInventory.bangla?.inShop || 0) ||
        (Number(paymentForm.plasticReturn) || 0) > Number(boxInventory.china?.inShop || 0))
    ) {
      setFeedback({ type: 'error', message: 'Not enough crates in shop for supplier issue.' });
      return;
    }

    try {
      const transaction = await recordAccountTransaction({
        ...paymentForm,
        supplierPaymentKind: isSupplierDuePay
          ? 'PRODUCT_PAYMENT'
          : isSupplierCommissionReceive
            ? 'COMMISSION_RECEIVE'
            : isSupplierExpenseReceive
              ? 'EXPENSE_RECEIVE'
              : paymentForm.supplierPaymentKind,
        supplierCrateDirection: isSupplierBoxBorrow ? 'give' : paymentForm.supplierCrateDirection,
        paymentType: 'Cash',
        amount: includesCashReceive ? Number(paymentForm.amount || 0) : 0,
        woodenReturn: includesBoxReceive ? Number(paymentForm.woodenReturn || 0) : 0,
        plasticReturn: includesBoxReceive ? Number(paymentForm.plasticReturn || 0) : 0,
        boxJamanotChange: includesJamanotEntry ? Number(paymentForm.boxJamanotChange || 0) : 0,
      });

      setFeedback({ type: 'success', message: '' });
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

      {feedback.type === 'success' && (
        <div className="success-splash" role="status" aria-label="Saved">
          <span>✓</span>
        </div>
      )}

      {feedback.type === 'error' && feedback.message && (
        <div className="status-error">
          <span>!</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {!showingPaymentForm ? (
        <form onSubmit={handleSaleSubmit} className="space-y-4">
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
                    paymentType: event.target.value === 'ONE_TIME' ? 'FULL_PAY' : prev.paymentType,
                    paymentAmount: event.target.value === 'ONE_TIME' ? '' : prev.paymentAmount,
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

          {isCrateSale && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div>
                <label>Bangla Crates</label>
                <input
                  type="number"
                  min="0"
                  value={saleForm.banglaCratesGiven}
                  onChange={(event) =>
                    setSaleForm((prev) => ({ ...prev, banglaCratesGiven: event.target.value }))
                  }
                  placeholder="0"
                  className="input-field"
                />
              </div>
              <div>
                <label>China Crates</label>
                <input
                  type="number"
                  min="0"
                  value={saleForm.chinaCratesGiven}
                  onChange={(event) =>
                    setSaleForm((prev) => ({ ...prev, chinaCratesGiven: event.target.value }))
                  }
                  placeholder="0"
                  className="input-field"
                />
              </div>
              <div>
                <label>Jamanot Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={saleForm.jamanotAmount}
                  onChange={(event) =>
                    setSaleForm((prev) => ({ ...prev, jamanotAmount: event.target.value }))
                  }
                  placeholder="0"
                  className="input-field"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>Payment Type</label>
              <select
                value={saleForm.paymentType}
                onChange={(event) =>
                  setSaleForm((prev) => ({
                    ...prev,
                    paymentType: event.target.value,
                    paymentAmount: event.target.value === 'PARTIAL_PAY' ? prev.paymentAmount : '',
                  }))
                }
                className="input-field"
                disabled={isOneTimeCustomer}
                required
              >
                <option value="FULL_DUE">Full Due</option>
                <option value="PARTIAL_PAY">Partial Pay</option>
                <option value="FULL_PAY">Full Pay</option>
              </select>
            </div>
            <div>
              <label>Payment Received</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={isOneTimeCustomer ? totalAmount : saleForm.paymentType === 'FULL_PAY' ? totalPayable : saleForm.paymentAmount}
                onChange={(event) =>
                  setSaleForm((prev) => ({ ...prev, paymentAmount: event.target.value }))
                }
                placeholder="0"
                className="input-field"
                disabled={saleForm.paymentType !== 'PARTIAL_PAY' || isOneTimeCustomer}
                required={saleForm.paymentType === 'PARTIAL_PAY'}
              />
          </div>
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
              <p>Choose supplier/customer money or crate operation.</p>
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
                        paymentMode: event.target.value === 'supplier'
                          ? 'supplier_due_pay'
                          : ['supplier_due_pay', 'supplier_box_borrow', 'supplier_commission_receive', 'supplier_expense_receive'].includes(prev.paymentMode)
                            ? 'cash'
                            : prev.paymentMode,
                        supplierPaymentKind: event.target.value === 'supplier' ? 'PRODUCT_PAYMENT' : prev.supplierPaymentKind,
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
              <h4>{paymentForm.partyType === 'supplier' ? 'Payment Type' : 'Receive Type'}</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label>Payment Mode</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(event) => {
                      const mode = event.target.value;
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentMode: mode,
                        supplierPaymentKind:
                          mode === 'supplier_due_pay'
                            ? 'PRODUCT_PAYMENT'
                            : mode === 'supplier_commission_receive'
                              ? 'COMMISSION_RECEIVE'
                              : mode === 'supplier_expense_receive'
                                ? 'EXPENSE_RECEIVE'
                                : prev.supplierPaymentKind,
                        supplierCrateDirection: mode === 'supplier_box_borrow' ? 'give' : mode === 'box' ? 'return' : prev.supplierCrateDirection,
                        amount: mode === 'box' || mode === 'supplier_box_borrow' ? '' : prev.amount,
                        boxJamanotChange: mode === 'box' ? '' : prev.boxJamanotChange,
                        woodenReturn: mode === 'cash' || mode === 'supplier_due_pay' || mode === 'supplier_commission_receive' || mode === 'supplier_expense_receive' ? '' : prev.woodenReturn,
                        plasticReturn: mode === 'cash' || mode === 'supplier_due_pay' || mode === 'supplier_commission_receive' || mode === 'supplier_expense_receive' ? '' : prev.plasticReturn,
                      }));
                    }}
                    className="input-field"
                    required
                  >
                    {paymentForm.partyType === 'supplier' ? (
                      <>
                        <option value="supplier_due_pay">Supplier Due</option>
                        <option value="box">Box Receive</option>
                        <option value="supplier_box_borrow">Box Borrow</option>
                        <option value="supplier_commission_receive">Commission Receive</option>
                        <option value="supplier_expense_receive">Extra Expenses Receive</option>
                      </>
                    ) : (
                      <>
                        <option value="cash">Cash Receive</option>
                        <option value="box">Box Receive</option>
                      </>
                    )}
                  </select>
                </div>
                {includesCashReceive && (
                  <div>
                    <label>
                      {paymentForm.partyType === 'customer'
                        ? 'Due Cash Received'
                        : isSupplierDuePay
                          ? 'Due Paid to Supplier'
                          : isSupplierCommissionReceive
                            ? 'Commission Received'
                            : isSupplierExpenseReceive
                              ? 'Extra Expenses Received'
                              : 'Cash Amount'}
                    </label>
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
                    Jamanot Refund
                    {includesBoxReceive ? ' *' : ''}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.boxJamanotChange}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, boxJamanotChange: event.target.value }))
                    }
                    min="0"
                    placeholder="0 allowed"
                    className="input-field"
                    required={includesBoxReceive}
                  />
                </div>
              )}
            </section>

            {includesBoxReceive && (
              <section className="payment-panel">
                <h4>{paymentForm.partyType === 'supplier' ? (isSupplierBoxBorrow ? 'Box Borrow' : 'Box Receive') : 'Crate Receive'}</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label>Bangla Crates</label>
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
                    <label>China Crates</label>
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
                    <p>Crates Received</p>
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
                  <p>Operation Amount</p>
                  <strong>{formatCurrency(includesCashReceive ? paymentDueAmount : 0)}</strong>
                </div>
                {includesBoxReceive && (
                  <div className="metric-tile">
                    <p>{isSupplierBoxBorrow ? 'Crates Borrowed' : 'Crates Received'}</p>
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
