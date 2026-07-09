import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HealthDashboard from './pages/HealthDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/diagnostics" element={<HealthDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
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
