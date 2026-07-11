import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HealthDashboard from './pages/HealthDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import KnowledgeBase from './pages/KnowledgeBase';
import Tickets from './pages/Tickets';
import Categories from './pages/Categories';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <SocketProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/diagnostics" element={<HealthDashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/kb" 
              element={
                <ProtectedRoute>
                  <KnowledgeBase />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/tickets" 
              element={
                <ProtectedRoute>
                  <Tickets />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/categories" 
              element={
                <ProtectedRoute>
                  <Categories />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <UserManagement />
                </ProtectedRoute>
              } 
            />

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

            {/* Fallback routes */}
            <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </SocketProvider>
  );
}

export default App;
