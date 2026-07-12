import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/userService';

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!user) return null;

  const validateForm = () => {
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return false;
    }
    if (!email.trim()) {
      setError('Email cannot be empty.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await updateProfile({ name, email });
      if (response.status === 'success') {
        setUser(response.data.user);
        setSuccess('Profile updated successfully.');
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Update profile failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(user.name);
    setEmail(user.email);
    setError(null);
    setSuccess(null);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-bgBase text-textSecondary p-6 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Visual background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-lg bg-bgSurface border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow relative z-10">
        
        {/* Header navigation */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-borderDefault">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-textMuted hover:text-textPrimary transition duration-150">
              ← Dashboard
            </Link>
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-textPrimary to-textSecondary bg-clip-text text-transparent">
            User Profile
          </h2>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
            <strong>Success:</strong> {success}
          </div>
        )}

        {/* Profile Card details */}
        {!isEditing ? (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-semibold text-textPrimary">{user.name}</h3>
                <p className="text-sm text-textMuted mt-1">{user.email}</p>
              </div>
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs font-semibold text-primary">
                {user.role}
              </span>
            </div>

            <div className="space-y-4 bg-bgSecondary p-5 rounded-2xl border border-borderDefault text-sm">
              <div className="flex justify-between">
                <span className="text-textMuted font-medium">Account ID</span>
                <span className="font-mono text-xs text-textSecondary">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted font-medium">Status</span>
                <span className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted font-medium">Created Date</span>
                <span className="text-textSecondary">
                  {new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-sm hover:opacity-90 shadow-lg shadow-indigo-500/25 transition duration-150"
            >
              Edit Profile Details
            </button>
          </div>
        ) : (
          /* Profile Edit Form */
          <form onSubmit={handleUpdate} noValidate className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs text-textMuted uppercase font-semibold block">Full Name</label>
              <input
                type="text"
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-bgBase border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textDisabled focus:outline-none focus:border-primary transition duration-150 disabled:opacity-50"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="w-1/2 py-3 rounded-xl bg-bgSecondary hover:bg-slate-700 text-textSecondary font-semibold text-sm transition duration-150 border border-borderDefault"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-1/2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-sm hover:opacity-90 transition duration-150 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-borderDefault border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
