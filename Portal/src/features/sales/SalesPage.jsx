import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Receipt, Search } from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { apiPaths, postJson } from '../../services/apiClient';
import { queryKeys } from '../../services/queryKeys';
import { formatMoney, formatDate } from '../../shared/utils/format';
import { Loader, EmptyRow, ErrorBanner } from '../../shared/components/Loader';
import { Modal, TablePager, usePagination } from '../../shared/components';
import SaleForm from './SaleForm';

const methodLabel = (value) => {
  const method = String(value || '').toUpperCase();
  if (!method || method === 'NONE') return 'Due';
  if (method === 'BKASH') return 'bKash';
  return method.charAt(0) + method.slice(1).toLowerCase();
};

const numberText = (value) => {
  const number = Number(value) || 0;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(number);
};

const itemName = (item) => [item.productName, item.categoryName, item.subCategoryName].filter(Boolean).join(' / ') || '—';

const uniqueCount = (items, key) => new Set((items || []).map((item) => item[key]).filter(Boolean)).size;
const localDateKey = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const receiptLine = '--------------------------------';

const SaleDetailBody = ({ detail }) => {
  const items = detail?.items || [];
  const quantityTotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const weightTotal = items.reduce((sum, item) => sum + (Number(item.saleWeightKg) || 0), 0);
  const crateLines = detail.crateLines || [];
  const crateInfo = crateLines.length
    ? crateLines.map((line) => line.crateType + ' ' + line.quantity).join(', ')
    : '—';

  return (
    <div className="mx-auto max-w-[28rem] rounded-sm border border-slate-300 bg-white px-5 py-4 font-mono text-[12px] leading-relaxed text-slate-900 shadow-sm">
      <div className="text-center">
        <p className="text-base font-black tracking-wide">SALE RECEIPT</p>
        <p className="mt-1 text-[11px] font-semibold text-slate-500">{detail.transactionCode || '—'}</p>
      </div>

      <div className="my-3 text-slate-400">{receiptLine}</div>

      <div className="space-y-1">
        <div className="flex justify-between gap-3"><span>Date</span><strong className="text-right">{formatDate(detail.saleDate)}</strong></div>
        <div className="flex justify-between gap-3"><span>Customer</span><strong className="text-right">{detail.customerName || '—'}</strong></div>
        {detail.customerPhone ? <div className="flex justify-between gap-3"><span>Phone</span><strong>{detail.customerPhone}</strong></div> : null}
        <div className="flex justify-between gap-3"><span>Payment</span><strong>{methodLabel(detail.paymentMethod)}</strong></div>
        <div className="flex justify-between gap-3"><span>Status</span><strong>{detail.status || '—'}</strong></div>
      </div>

      <div className="my-3 text-slate-400">{receiptLine}</div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const qtyText = numberText(item.quantity) + ' ' + String(item.unit || '').toLowerCase();
          const weightText = item.saleWeightKg ? ' / ' + numberText(item.saleWeightKg) + 'kg' : '';
          return (
            <div key={item.saleItemId} className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 pr-2">
                  <p className="break-words font-black">{index + 1}. {itemName(item)}</p>
                  <p className="text-[11px] text-slate-500">{item.supplierName || '—'}{item.deliveryName ? ' / ' + item.deliveryName : ''}</p>
                </div>
                <strong className="shrink-0 text-right">{formatMoney(item.lineTotal)}</strong>
              </div>
              <div className="flex justify-between gap-3 text-[11px] text-slate-600">
                <span>{qtyText}{weightText}</span>
                <span>@ {formatMoney(item.unitPrice)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="my-3 text-slate-400">{receiptLine}</div>

      <div className="space-y-1">
        <div className="flex justify-between gap-3"><span>Items</span><strong>{items.length}</strong></div>
        <div className="flex justify-between gap-3"><span>Suppliers</span><strong>{uniqueCount(items, 'wholesalerSupplierId')}</strong></div>
        <div className="flex justify-between gap-3"><span>Total qty</span><strong>{numberText(quantityTotal)}</strong></div>
        {weightTotal > 0 ? <div className="flex justify-between gap-3"><span>Total kg</span><strong>{numberText(weightTotal)}</strong></div> : null}
        <div className="flex justify-between gap-3"><span>Crate borrow</span><strong className="text-right">{crateInfo}</strong></div>
        {Number(detail.crateDepositAmount || 0) > 0 ? <div className="flex justify-between gap-3"><span>Crate deposit</span><strong>{formatMoney(detail.crateDepositAmount)}</strong></div> : null}
        {Number(detail.crateSaleAmount || 0) > 0 ? <div className="flex justify-between gap-3"><span>Crate sale</span><strong>{formatMoney(detail.crateSaleAmount)}</strong></div> : null}
      </div>

      <div className="my-3 text-slate-400">{receiptLine}</div>

      <div className="space-y-1 text-[13px]">
        <div className="flex justify-between gap-3"><span>Gross</span><strong>{formatMoney(detail.grossAmount)}</strong></div>
        <div className="flex justify-between gap-3"><span>Discount</span><strong>{formatMoney(detail.discountAmount)}</strong></div>
        <div className="mt-2 flex justify-between gap-3 border-t border-dashed border-slate-300 pt-2 text-base"><span className="font-black">NET</span><strong>{formatMoney(detail.netAmount)}</strong></div>
        <div className="flex justify-between gap-3 text-emerald-700"><span>Paid</span><strong>{formatMoney(detail.paidAmount)}</strong></div>
        <div className="flex justify-between gap-3 text-rose-700"><span>Due</span><strong>{formatMoney(detail.dueAmount)}</strong></div>
      </div>

      {detail.note ? (
        <>
          <div className="my-3 text-slate-400">{receiptLine}</div>
          <p className="break-words text-center text-[11px] text-slate-600">{detail.note}</p>
        </>
      ) : null}

      <div className="my-3 text-slate-400">{receiptLine}</div>
      <p className="text-center text-[11px] font-semibold text-slate-500">Thank you</p>
    </div>
  );
};

const SalesPage = () => {
  const { admin } = useAuth();
  const { fetchTransactionsRange } = useData();
  const [showModal, setShowModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const { data: raw = [], isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.transactions.list(admin?.wholesalerId, null, null),
    queryFn: () => fetchTransactionsRange(null, null),
    enabled: Boolean(admin?.wholesalerId),
  });

  const sales = useMemo(() => {
    const groups = new Map();
    (raw || [])
      .filter((t) => (t.transactionType || '').toUpperCase() !== 'PAYMENT')
      .forEach((t) => {
        const key = t.saleId || t.id;
        const current = groups.get(key) || {
          id: key,
          saleId: t.saleId || key,
          createdAt: t.createdAt,
          customerName: t.customerName || '—',
          customerPhone: t.customerPhone || '',
          suppliers: new Set(),
          transactionCount: 0,
          saleAmount: 0,
          paymentAmount: 0,
          grossAmount: Number(t.grossAmount) || 0,
          discountAmount: Number(t.discountAmount) || 0,
          paymentMethod: t.paymentMethod || '',
          description: t.description || '',
        };
        current.createdAt = current.createdAt || t.createdAt;
        if (current.customerName === '—' && t.customerName) current.customerName = t.customerName;
        if (t.supplierName) current.suppliers.add(t.supplierName);
        current.transactionCount += 1;
        current.saleAmount += Number(t.saleAmount) || 0;
        current.paymentAmount += Number(t.paymentAmount) || 0;
        current.grossAmount = current.grossAmount || Number(t.grossAmount) || 0;
        current.discountAmount = current.discountAmount || Number(t.discountAmount) || 0;
        groups.set(key, current);
      });

    return [...groups.values()]
      .map((sale) => ({
        ...sale,
        suppliers: [...sale.suppliers],
        dueAmount: Math.max(0, sale.saleAmount - sale.paymentAmount),
      }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [raw]);

  const { pageItems: pagedSales, ...salePager } = usePagination(sales, 15);
  const todaySales = useMemo(() => {
    const today = localDateKey(new Date());
    return sales.filter((sale) => localDateKey(sale.createdAt) === today);
  }, [sales]);
  const salesTotals = useMemo(() => ({
    count: todaySales.length,
    sold: todaySales.reduce((sum, sale) => sum + (Number(sale.saleAmount) || 0), 0),
    paid: todaySales.reduce((sum, sale) => sum + (Number(sale.paymentAmount) || 0), 0),
    due: todaySales.reduce((sum, sale) => sum + (Number(sale.dueAmount) || 0), 0),
  }), [todaySales]);

  const openSaleDetail = async (saleId) => {
    setSelectedSaleId(saleId);
    setDetailError('');
    if (detailCache[saleId] || !admin?.wholesalerId) return;

    setDetailLoadingId(saleId);
    try {
      const detail = await postJson(apiPaths.salesDetail(admin.wholesalerId, saleId));
      setDetailCache((current) => ({ ...current, [saleId]: detail }));
    } catch (error) {
      setDetailError(error.message || 'Failed to load sale details.');
    } finally {
      setDetailLoadingId(null);
    }
  };

  const handleTransactionSearch = async (event) => {
    event.preventDefault();
    const code = transactionSearch.trim().toUpperCase();
    setSearchError('');
    if (!/^[A-Z0-9]{10}$/.test(code)) {
      setSearchError('Enter 10 characters: A-Z, 0-9.');
      return;
    }
    if (!admin?.wholesalerId) return;

    setSearchLoading(true);
    setDetailError('');
    try {
      const detail = await postJson(apiPaths.salesDetailByTransactionCode(admin.wholesalerId, code));
      setDetailCache((current) => ({ ...current, [detail.saleId]: detail }));
      setSelectedSaleId(detail.saleId);
    } catch (error) {
      setSearchError(error.message || 'Sale not found.');
    } finally {
      setSearchLoading(false);
    }
  };

  const selectedDetail = selectedSaleId == null ? null : detailCache[selectedSaleId];
  const selectedSale = sales.find((sale) => sale.saleId === selectedSaleId);
  const selectedTitle = selectedDetail?.transactionCode
    ? 'Sale ' + selectedDetail.transactionCode
    : selectedSale?.customerName || 'Sale detail';

  return (
    <div className="space-y-5">
      <div className="profile-workspace">
        <main className="profile-main-stack">
          <section className="inventory-hero">
            <div>
              <span className="box-eyebrow">Sales</span>
              <h3>Record &amp; track sales</h3>
            </div>
          </section>

          <div className="supplier-panel">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2"><Receipt size={18} className="text-blue-600" /> Recent Sales</h3>
              <span className="badge badge-teal">{sales.length} total</span>
            </div>

            {isLoading ? (
              <Loader />
            ) : sales.length === 0 ? (
              <EmptyRow label="No sales yet. Click 'New Sale' to record your first one." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="center-table w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Customer</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Amount</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Paid</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Due</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedSales.map((sale) => {
                      const cancelled = String(sale.description || '').toLowerCase().includes('cancellation of sale');
                      return (
                        <tr
                          key={sale.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openSaleDetail(sale.saleId)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              openSaleDetail(sale.saleId);
                            }
                          }}
                          className={`cursor-pointer transition hover:bg-slate-50 ${cancelled ? 'opacity-50 line-through' : ''}`}
                        >
                          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                          <td className="px-4 py-3 text-left font-semibold text-slate-800">{sale.customerName || '—'}</td>
                          <td className="px-4 py-3 font-extrabold text-slate-900">{formatMoney(sale.saleAmount)}</td>
                          <td className="px-4 py-3 text-emerald-700 font-semibold">{formatMoney(sale.paymentAmount)}</td>
                          <td className="px-4 py-3 text-rose-700 font-semibold">{formatMoney(sale.dueAmount)}</td>
                          <td className="px-4 py-3"><span className="badge badge-teal">{methodLabel(sale.paymentMethod)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!isLoading && sales.length > 0 && <TablePager {...salePager} />}
            {queryError && <div className="mt-3"><ErrorBanner message={queryError.message || 'Failed to load sales.'} /></div>}
          </div>
        </main>

        <aside className="profile-side-stack">
          <div className="supplier-panel">
            <h3>Sales Actions</h3>
            <button type="button" className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-2" onClick={() => setShowModal(true)}>
              <Plus size={16} /> New Sale
            </button>
          </div>

          <div className="supplier-panel">
            <h3 className="flex items-center gap-2"><Search size={16} className="text-blue-600" /> Find Sale</h3>
            <form className="mt-3 space-y-2" onSubmit={handleTransactionSearch}>
              <input
                className="form-input font-mono uppercase tracking-wide"
                value={transactionSearch}
                maxLength={10}
                onChange={(event) => {
                  setTransactionSearch(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  setSearchError('');
                }}
                placeholder="A1B2C3D4E5"
              />
              <button type="submit" className="btn-secondary inline-flex w-full items-center justify-center gap-2" disabled={searchLoading}>
                <Search size={15} /> {searchLoading ? 'Searching' : 'Search'}
              </button>
            </form>
            {searchError && <div className="mt-3"><ErrorBanner message={searchError} /></div>}
          </div>

          <div className="supplier-panel">
            <h3>Today Sales Summary</h3>
            <div className="mt-3 space-y-2">
              <div className="box-row"><span>Today sales</span><strong>{salesTotals.count}</strong></div>
              <div className="box-row"><span>Sold amount</span><strong>{formatMoney(salesTotals.sold)}</strong></div>
              <div className="box-row"><span>Paid</span><strong className="text-emerald-700">{formatMoney(salesTotals.paid)}</strong></div>
              <div className="box-row total"><span>Due</span><strong className="text-rose-700">{formatMoney(salesTotals.due)}</strong></div>
            </div>
          </div>
        </aside>
      </div>

      {showModal && <SaleForm onClose={() => setShowModal(false)} />}
      <Modal
        open={selectedSaleId != null}
        onClose={() => setSelectedSaleId(null)}
        title={selectedTitle}
        subtitle={selectedDetail ? [selectedDetail.customerName, formatDate(selectedDetail.saleDate)].filter(Boolean).join(' • ') : 'Loading sale details'}
        icon={Receipt}
        iconClass="bg-blue-100 text-blue-700"
        maxWidth="34rem"
        footer={<button type="button" className="btn-secondary" onClick={() => setSelectedSaleId(null)}>Close</button>}
      >
        <div className="max-h-[72vh] overflow-y-auto pr-1">
          {detailLoadingId === selectedSaleId ? (
            <Loader />
          ) : detailError && !selectedDetail ? (
            <ErrorBanner message={detailError} />
          ) : selectedDetail ? (
            <SaleDetailBody detail={selectedDetail} />
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

export default SalesPage;
