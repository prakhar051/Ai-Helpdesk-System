import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HealthDashboard from './pages/HealthDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/diagnostics" element={<HealthDashboard />} />
        {/* Redirect home or any path to diagnostics for setup verification */}
        <Route path="*" element={<Navigate to="/diagnostics" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
