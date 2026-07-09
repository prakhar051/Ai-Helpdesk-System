import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import Loader from '../components/common/Loader';
import { useAuth } from '../context/AuthContext';

export default function HealthDashboard() {
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);

  // Auth Context State
  const { user, loading: authLoading, login, register, logout } = useAuth();
  
  // Local Auth Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);
  
  // Custom API Test States
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const response = await apiClient.get('/health');
      setHealthData(response.data.data);
    } catch (err) {
      console.error('Health check failed:', err);
      setHealthError(err.message || 'Failed to connect to backend server');
      if (err.data) {
        setHealthData(err.data.data);
      }
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!name || !email || !password) {
      setAuthError('Name, email, and password are required for registration.');
      return;
    }
    try {
      await register(name, email, password);
      setAuthSuccess('User registered and logged in successfully!');
      // Clear forms
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!email || !password) {
      setAuthError('Email and password are required for login.');
      return;
    }
    try {
      await login(email, password);
      setAuthSuccess('Logged in successfully!');
      // Clear forms
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
    }
  };

  const handleLogout = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    setApiResponse(null);
    try {
      await logout();
      setAuthSuccess('Logged out successfully!');
    } catch (err) {
      setAuthError(err.message || 'Logout failed.');
    }
  };

  const testProtectedRoute = async (endpoint) => {
    setApiLoading(true);
    setApiResponse(null);
    try {
      const res = await apiClient.get(`/auth/${endpoint}`);
      setApiResponse({
        status: 'success',
        endpoint: `/auth/${endpoint}`,
        data: res.data
      });
    } catch (err) {
      setApiResponse({
        status: 'error',
        endpoint: `/auth/${endpoint}`,
        message: err.message,
        data: err.data
      });
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-200 p-6 flex flex-col items-center justify-center">
      {/* Title Header */}
      <div className="w-full max-w-5xl mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/40 flex items-center justify-center font-bold text-white text-lg">
          A
        </div>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Apex AI Helpdesk Diagnostics & Testing Panel
          </h2>
          <p className="text-sm text-gray-400">
            Phase 2: Authentication Infrastructure & Frontend Context Verification
          </p>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Diagnostics Card */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl transition duration-500 hover:border-indigo-500/20">
          <h2 className="text-lg font-bold text-white mb-2">System Diagnostics</h2>
          <p className="text-sm text-gray-400 mb-6">
            Real-time status check for database connectivity.
          </p>

          {healthLoading ? (
            <div className="py-8">
              <Loader text="Querying backend health..." />
            </div>
          ) : healthError ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <strong>Error:</strong> {healthError}
              </div>
              
              {healthData && (
                <div className="space-y-2 border-t border-white/5 pt-4 text-sm text-gray-400">
                  <div className="flex justify-between">
                    <span>Server:</span>
                    <span className="text-emerald-400 font-semibold">{healthData.server}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Database:</span>
                    <span className="text-red-400 font-semibold">{healthData.database}</span>
                  </div>
                </div>
              )}

              <button 
                onClick={fetchHealth} 
                className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-600/30 transition duration-150"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Server Health Status:</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase bg-emerald-500/10 text-emerald-400">
                    {healthData.server}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">PostgreSQL Connection:</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase bg-emerald-500/10 text-emerald-400">
                    {healthData.database}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Server Uptime:</span>
                  <span className="text-gray-200 font-mono">
                    {Math.round(healthData.uptime)}s
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Diagnostics Check:</span>
                  <span className="text-gray-200 font-mono text-xs">
                    {new Date(healthData.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <button 
                onClick={fetchHealth} 
                className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-600/30 transition duration-150"
              >
                Refresh Diagnostics
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Authentication Verification */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl transition duration-500 hover:border-indigo-500/20">
          <h2 className="text-lg font-bold text-white mb-2">Auth Context & JWT Verification</h2>
          <p className="text-sm text-gray-400 mb-6">
            Verify user registration, login, JWT storage, and route authorization.
          </p>

          {authLoading ? (
            <div className="py-8">
              <Loader text="Updating auth context..." />
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Auth Status Banner */}
              <div className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
                user 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                <div>
                  <span className="font-semibold block">Authentication State:</span>
                  {user ? (
                    <span>Logged in as: <strong className="text-white font-mono">{user.name}</strong> ({user.role})</span>
                  ) : (
                    <span>Not Authenticated</span>
                  )}
                </div>
                {user && (
                  <button 
                    onClick={handleLogout}
                    className="py-1 px-3 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 font-medium text-xs transition duration-150"
                  >
                    Logout
                  </button>
                )}
              </div>

              {/* Status Alert Panels */}
              {authError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                  <strong>Error:</strong> {authError}
                </div>
              )}
              {authSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs">
                  {authSuccess}
                </div>
              )}

              {/* Unauthenticated View: Register & Login Panel */}
              {!user ? (
                <form className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Name (Only for Registration)</label>
                    <input 
                      type="text" 
                      placeholder="John Doe" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#161C2C] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="john@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#161C2C] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#161C2C] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <button 
                      onClick={handleRegister}
                      className="py-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 font-medium text-sm transition duration-150"
                    >
                      Register User
                    </button>
                    <button 
                      onClick={handleLogin}
                      className="py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-90 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 transition duration-150"
                    >
                      Login
                    </button>
                  </div>
                </form>
              ) : (
                /* Authenticated View: API Testing Suite */
                <div className="space-y-4">
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2 text-xs">
                    <div><span className="text-gray-400">User ID:</span> <span className="font-mono text-gray-300">{user.id}</span></div>
                    <div><span className="text-gray-400">Email:</span> <span className="font-mono text-gray-300">{user.email}</span></div>
                    <div><span className="text-gray-400">Role:</span> <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold">{user.role}</span></div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase font-semibold block">Test Protected API Endpoints</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => testProtectedRoute('me')}
                        className="py-2 px-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-xs border border-white/10 transition duration-150"
                      >
                        GET /me
                      </button>
                      <button 
                        onClick={() => testProtectedRoute('agent-only')}
                        className="py-2 px-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-medium text-xs border border-indigo-500/20 transition duration-150"
                      >
                        Agent Only
                      </button>
                      <button 
                        onClick={() => testProtectedRoute('admin-only')}
                        className="py-2 px-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-medium text-xs border border-cyan-500/20 transition duration-150"
                      >
                        Admin Only
                      </button>
                    </div>
                  </div>

                  {/* API Output Window */}
                  {apiLoading ? (
                    <div className="py-4">
                      <Loader size="sm" text="Calling endpoint..." />
                    </div>
                  ) : apiResponse && (
                    <div className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                      apiResponse.status === 'success' 
                        ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300' 
                        : 'bg-red-950/40 border-red-500/20 text-red-300'
                    }`}>
                      <div className="flex justify-between font-bold">
                        <span>Endpoint: {apiResponse.endpoint}</span>
                        <span className="uppercase">{apiResponse.status}</span>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap max-h-40">
                        {JSON.stringify(apiResponse.data || apiResponse.message, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-center text-xs text-indigo-400">
                    💡 <strong>Test Session Restore:</strong> Refresh the page to verify that the auth state is automatically restored!
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
