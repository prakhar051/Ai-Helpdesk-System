import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import Loader from '../components/common/Loader';

export default function HealthDashboard() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/health');
      setHealthData(response.data.data);
    } catch (err) {
      console.error('Health check failed:', err);
      setError(err.message || 'Failed to connect to backend server');
      if (err.data) {
        setHealthData(err.data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl transition duration-500 hover:border-indigo-500/30 hover:shadow-indigo-500/5">
        
        {/* Logo/Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/40 flex items-center justify-center font-bold text-white">
            A
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Apex AI Helpdesk
          </h2>
        </div>

        <h1 className="text-lg font-semibold text-gray-200 mb-2">System Diagnostics</h1>
        <p className="text-sm text-gray-400 mb-6">
          Verifying connectivity states between Client, Express Server, and MongoDB.
        </p>

        {loading ? (
          <div className="py-8">
            <Loader text="Querying backend health..." />
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <strong>Error:</strong> {error}
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
              className="w-full btn py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-600/30 transition duration-150 hover:-translate-y-0.5"
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
                <span className="text-gray-400">MongoDB Connection:</span>
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
              className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-600/30 transition duration-150 hover:-translate-y-0.5"
            >
              Refresh Diagnostics
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
