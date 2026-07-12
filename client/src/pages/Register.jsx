import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';

export default function Register() {
  const { user, register, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const validateForm = () => {
    if (!name.trim()) {
      setError('Name is required.');
      return false;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password) {
      setError('Password is required.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      await register(name, email, password);
      // Success logs user in and navigation is handled by useEffect
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading && !user) {
    return (
      <div className="min-h-screen bg-bgBase flex items-center justify-center">
        <Loader size="lg" text="Checking authentication status..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgBase text-textSecondary flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Visual background blobs for rich styling */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-bgSurface border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow relative z-10">
        
        {/* Brand/Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/40 flex items-center justify-center font-bold text-textPrimary text-xl mb-4">
            A
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-textPrimary to-textSecondary bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="text-sm text-textMuted mt-1">
            Register your Helpdesk profile
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-textMuted uppercase font-semibold block">Full Name</label>
            <input 
              type="text" 
              placeholder="John Doe" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full bg-bgBase border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textDisabled focus:outline-none focus:border-primary transition duration-150 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-textMuted uppercase font-semibold block">Email Address</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-bgBase border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textDisabled focus:outline-none focus:border-primary transition duration-150 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-textMuted uppercase font-semibold block">Password</label>
            <input 
              type="password" 
              placeholder="•••••••• (Min 6 chars)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-bgBase border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textDisabled focus:outline-none focus:border-primary transition duration-150 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-textMuted uppercase font-semibold block">Confirm Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-bgBase border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textDisabled focus:outline-none focus:border-primary transition duration-150 disabled:opacity-50"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-90 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition duration-150 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-borderDefault border-t-white rounded-full animate-spin"></div>
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Redirect Footer */}
        <div className="mt-6 text-center text-sm text-textMuted border-t border-borderDefault pt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-primary-hover font-medium transition duration-150">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}
