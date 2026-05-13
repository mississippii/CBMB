import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { admin, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
            <span className="text-lg">📦</span>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              CBTrading
            </h1>
            <p className="text-xs text-gray-500 font-medium">Trading Portal</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="hidden sm:block">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Admin</p>
            <p className="text-sm font-semibold text-gray-800">{admin?.fullName}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
          >
            <span>🚪</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
