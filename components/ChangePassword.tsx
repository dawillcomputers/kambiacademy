import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`])/;

const ChangePassword: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const checks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    digit: /\d/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(newPassword),
  };

  const allValid = Object.values(checks).every(Boolean) && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!allValid) { setError('Please fix validation errors.'); return; }
    setLoading(true);
    try {
      const response = await api.changePassword(currentPassword, newPassword);
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
      }
      await refreshUser(); // Update user state to reflect password change
      setSuccess('Password changed successfully. Redirecting...');
      setTimeout(() => {
        if (response.user.role === 'super_admin') navigate('/superadmin');
        else if (response.user.role === 'admin') navigate('/admin');
        else if (response.user.role === 'teacher') navigate('/tutor');
        else navigate('/student');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const Check = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={`text-sm flex items-center gap-1 ${ok ? 'text-green-400' : 'text-gray-500'}`}>
      <span>{ok ? '✓' : '○'}</span> {label}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-2">Change Password</h2>
        {user?.mustChangePassword && (
          <p className="text-yellow-400 text-sm mb-4">You must change your password before continuing.</p>
        )}

        {error && <div className="bg-red-900/50 text-red-300 px-4 py-2 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-900/50 text-green-300 px-4 py-2 rounded mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg pr-10"
                required
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm">
                {showCurrent ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg pr-10"
                required
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm">
                {showNew ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="mt-2 space-y-1">
              <Check ok={checks.length} label="At least 8 characters" />
              <Check ok={checks.upper} label="Uppercase letter" />
              <Check ok={checks.lower} label="Lowercase letter" />
              <Check ok={checks.digit} label="Number" />
              <Check ok={checks.special} label="Special character" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
              required
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-red-400 text-sm mt-1">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!allValid || loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg font-medium"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
