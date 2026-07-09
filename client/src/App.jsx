import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HealthDashboard from './pages/HealthDashboard';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

const LoginPageMock = () => (
  <div className="min-h-screen bg-[#0B0F19] text-gray-200 p-6 flex flex-col items-center justify-center">
    <div className="bg-slate-900 border border-white/10 p-6 rounded-xl max-w-sm text-center">
      <h2 className="text-lg font-bold text-white mb-2">Login Required</h2>
      <p className="text-sm text-gray-400 mb-4">You have been redirected here because the route is protected.</p>
      <a href="/diagnostics" className="text-indigo-400 hover:text-indigo-300 font-medium text-sm">Go to Diagnostics Panel to Log In &rarr;</a>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/diagnostics" element={<HealthDashboard />} />
          <Route path="/login" element={<LoginPageMock />} />
          
          {/* Protected test route to verify routing restrictions */}
          <Route 
            path="/protected-test" 
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-[#0B0F19] text-emerald-400 flex items-center justify-center font-bold">
                  🔐 Access Granted: Welcome to the Protected Admin/Agent Sandbox!
                </div>
              </ProtectedRoute>
            } 
          />

          {/* Redirect home or any path to diagnostics for setup verification */}
          <Route path="*" element={<Navigate to="/diagnostics" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
