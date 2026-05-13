import { useData } from '../context/DataContext';

const CustomerDetail = ({ customerId }) => {
  const { customers } = useData();

  const customer = customers.find((item) => item.id === customerId);

  if (!customer) {
    return <div className="text-gray-600">Customer not found</div>;
  }

  const initials = customer.name
    .split(' ')
    .map((name) => name[0])
    .join('');

  return (
    <div className="space-y-6">
      <div className="status-success">
        <span>ℹ️</span>
        <span>Payments and box updates are managed from "Payment / Due / Box Update" in Transactions.</span>
      </div>

      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
            <span className="text-2xl font-bold text-gray-700">{initials}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-1">{customer.name}</h2>
            <p className="text-gray-500 text-sm">
              Type: <span className="font-semibold text-gray-700">{customer.type}</span> • Owner:{' '}
              <span className="font-semibold text-gray-700">{customer.owner}</span>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Address</p>
            <p className="text-sm font-medium text-gray-900 line-clamp-2">{customer.address}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Contact</p>
            <p className="text-sm font-medium text-gray-900">{customer.phone}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Type</p>
            <p className="text-sm font-medium text-gray-900">{customer.type}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Account Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Purchases</p>
            <p className="text-2xl font-bold text-gray-900">৳ {customer.totalPurchases.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Amount Paid</p>
            <p className="text-2xl font-bold text-gray-900">৳ {customer.totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-300">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">Cash Due</p>
            <p className="text-2xl font-bold text-gray-900">৳ {customer.amountDue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Box জামানত</p>
            <p className="text-2xl font-bold text-gray-900">৳ {(customer.boxJamanot || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Boxes Due</p>
            <p className="text-2xl font-bold text-gray-900">{customer.totalBoxesHolding}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Boxes Inventory</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Wooden</p>
            <p className="text-4xl font-bold text-gray-900">{customer.boxesHoldingWooden}</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Plastic</p>
            <p className="text-4xl font-bold text-gray-900">{customer.boxesHoldingPlastic}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-300 text-center">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Total</p>
            <p className="text-4xl font-bold text-gray-900">{customer.totalBoxesHolding}</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CustomerDetail;
