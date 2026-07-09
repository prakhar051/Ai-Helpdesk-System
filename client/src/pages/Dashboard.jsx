import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  if (!user) return null;

  // Render Admin Layout
  const renderAdminView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-xs uppercase font-semibold">Active Agents</span>
          <h3 className="text-3xl font-bold text-white mt-1">12</h3>
          <span className="text-emerald-400 text-xs mt-2 block">✓ 10 currently online</span>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-xs uppercase font-semibold">Total Customers</span>
          <h3 className="text-3xl font-bold text-white mt-1">248</h3>
          <span className="text-indigo-400 text-xs mt-2 block">+14 registered this week</span>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-xs uppercase font-semibold">SLA Resolution Rate</span>
          <h3 className="text-3xl font-bold text-white mt-1">98.4%</h3>
          <span className="text-emerald-400 text-xs mt-2 block">Above target SLA threshold</span>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">System Settings & Management</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link to="/admin/users" className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition duration-150 text-center block">
            Manage Users
          </Link>
          <Link to="/kb" className="p-4 bg-slate-800 hover:bg-slate-700 text-gray-200 text-sm font-semibold rounded-xl transition duration-150 text-center border border-white/5 block">
            Manage Articles
          </Link>
          <Link to="/categories" className="p-4 bg-slate-800 hover:bg-slate-700 text-gray-200 text-sm font-semibold rounded-xl transition duration-150 text-center border border-white/5 block">
            Manage Categories
          </Link>
          <button className="p-4 bg-slate-800 hover:bg-slate-700 text-gray-200 text-sm font-semibold rounded-xl transition duration-150 text-center border border-white/5">
            Database Settings
          </button>
        </div>
      </div>
    </div>
  );

  // Render Agent Layout
  const renderAgentView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-xs uppercase font-semibold">My Assigned Tickets</span>
          <h3 className="text-3xl font-bold text-white mt-1">5</h3>
          <span className="text-amber-400 text-xs mt-2 block">2 marked as High Priority</span>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-xs uppercase font-semibold">Resolved Today</span>
          <h3 className="text-3xl font-bold text-white mt-1">8</h3>
          <span className="text-emerald-400 text-xs mt-2 block">Average resolve time: 14m</span>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-xs uppercase font-semibold">Pending Feedback</span>
          <h3 className="text-3xl font-bold text-white mt-1">2</h3>
          <span className="text-gray-400 text-xs mt-2 block">Awaiting customer response</span>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Assigned Tickets Queue</h3>
        <div className="space-y-3">
          <div className="p-4 bg-[#161C2C] border border-white/5 rounded-xl flex items-center justify-between">
            <div>
              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-semibold uppercase">High</span>
              <h4 className="text-sm font-semibold text-white mt-1">Cannot access diagnostic portal</h4>
              <p className="text-xs text-gray-400">Customer: Alice Johnson | Updated 5m ago</p>
            </div>
            <Link to="/tickets" className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition duration-150 block text-center">
              Open Ticket
            </Link>
          </div>
          <div className="p-4 bg-[#161C2C] border border-white/5 rounded-xl flex items-center justify-between">
            <div>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-gray-400 text-[10px] font-semibold uppercase">Medium</span>
              <h4 className="text-sm font-semibold text-white mt-1">Reset password mail not received</h4>
              <p className="text-xs text-gray-400">Customer: Bob Smith | Updated 1h ago</p>
            </div>
            <Link to="/tickets" className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition duration-150 block text-center">
              Open Ticket
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Customer Layout
  const renderCustomerView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-gray-400 text-xs uppercase font-semibold">Active Support Tickets</span>
            <h3 className="text-3xl font-bold text-white mt-1">1</h3>
            <span className="text-gray-400 text-xs mt-2 block">Our agents are reviewing your request.</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            In Progress
          </div>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-gray-400 text-xs uppercase font-semibold">Resolved Requests</span>
            <h3 className="text-3xl font-bold text-white mt-1">3</h3>
            <span className="text-emerald-400 text-xs mt-2 block">✓ All issues resolved</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            All Clear
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center py-10">
        <h3 className="text-lg font-bold text-white mb-2">Need Technical Assistance?</h3>
        <p className="text-sm text-gray-400 max-w-sm mb-6">
          Submit a ticket to connect with our dedicated customer support agents.
        </p>
        <Link to="/tickets" className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:opacity-90 transition duration-150 block">
          Create Support Ticket
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-200 p-6 flex flex-col items-center">
      {/* Top Banner Navigation */}
      <div className="w-full max-w-5xl bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-white text-lg">
            A
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Dashboard Portal</h1>
            <p className="text-xs text-gray-400">Logged in as: <strong className="text-gray-200">{user.name}</strong></p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-indigo-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Role: {user.role}
          </div>
          <Link 
            to="/kb"
            className="py-1.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs border border-white/10 transition duration-150"
          >
            Knowledge Base
          </Link>
          <Link 
            to="/tickets"
            className="py-1.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs border border-white/10 transition duration-150"
          >
            Support Tickets
          </Link>
          <Link 
            to="/categories"
            className="py-1.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs border border-white/10 transition duration-150"
          >
            Categories
          </Link>
          <Link 
            to="/profile"
            className="py-1.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs border border-white/10 transition duration-150"
          >
            My Profile
          </Link>
          <button 
            onClick={handleLogout}
            className="py-1.5 px-4 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/20 font-semibold text-xs transition duration-150"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Dashboard Space */}
      <div className="w-full max-w-5xl">
        {user.role === 'ADMIN' && renderAdminView()}
        {user.role === 'AGENT' && renderAgentView()}
        {user.role === 'CUSTOMER' && renderCustomerView()}
      </div>
    </div>
  );
}
