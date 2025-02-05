import React, { useState } from 'react';
import { superAdminAuthService } from '../../services/SuperAdminAuthService';

const SuperAdminPasswordChange = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (password) => {
    const requirements = [
      {
        test: password.length >= 12,
        message: 'Password must be at least 12 characters long'
      },
      {
        test: /[A-Z]/.test(password),
        message: 'Password must contain at least one uppercase letter'
      },
      {
        test: /[a-z]/.test(password),
        message: 'Password must contain at least one lowercase letter'
      },
      {
        test: /[0-9]/.test(password),
        message: 'Password must contain at least one number'
      },
      {
        test: /[!@#$%^&*]/.test(password),
        message: 'Password must contain at least one special character (!@#$%^&*)'
      }
    ];

    for (const requirement of requirements) {
      if (!requirement.test) {
        return requirement.message;
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate passwords match
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      // Validate password requirements
      const validationError = validatePassword(newPassword);
      if (validationError) {
        throw new Error(validationError);
      }

      // Change password
      await superAdminAuthService.changePassword(currentPassword, newPassword);
      
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Change Super Admin Password
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-gray-700"
          >
            Current Password
          </label>
          <input
            type="password"
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm
              focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-gray-700"
          >
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm
              focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700"
          >
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm
              focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
            {success}
          </div>
        )}

        <div className="flex items-center space-x-4">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 py-2 px-4 border border-transparent rounded-md
              shadow-sm text-sm font-medium text-white bg-blue-600
              hover:bg-blue-700 focus:outline-none focus:ring-2
              focus:ring-offset-2 focus:ring-blue-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Password Requirements:</h3>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
          <li>At least 12 characters long</li>
          <li>At least one uppercase letter</li>
          <li>At least one lowercase letter</li>
          <li>At least one number</li>
          <li>At least one special character (!@#$%^&*)</li>
        </ul>
      </div>
    </div>
  );
};

export default SuperAdminPasswordChange;
