import React, { useState, useEffect } from 'react';
import { SecurityService } from '../../services/SecurityService';
import {
  ShieldCheckIcon,
  FingerPrintIcon,
  DevicePhoneMobileIcon,
  BellIcon,
  KeyIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const SecuritySettings = ({ user }) => {
  const [settings, setSettings] = useState({
    twoFactor: false,
    biometric: false,
    pushNotifications: false
  });
  const [securityLogs, setSecurityLogs] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadSecuritySettings();
    loadSecurityLogs();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      setSettings({
        twoFactor: user.hasTwoFactor || false,
        biometric: user.hasBiometric || false,
        pushNotifications: user.pushEnabled || false
      });
    } catch (error) {
      console.error('Error loading security settings:', error);
      setError('Failed to load security settings');
    }
  };

  const loadSecurityLogs = async () => {
    try {
      const logs = await SecurityService.getSecurityLogs();
      setSecurityLogs(logs);
    } catch (error) {
      console.error('Error loading security logs:', error);
      setError('Failed to load security logs');
    }
  };

  const handleEnableTwoFactor = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const verId = await SecurityService.enableTwoFactor(phoneNumber);
      setVerificationId(verId);
      setSuccess('Verification code sent to your phone');
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      setError('Failed to enable two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await SecurityService.verifyTwoFactorCode(verificationId, verificationCode);
      setSettings(prev => ({ ...prev, twoFactor: true }));
      setSuccess('Two-factor authentication enabled successfully');
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      setError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await SecurityService.enableBiometric();
      setSettings(prev => ({ ...prev, biometric: true }));
      setSuccess('Biometric authentication enabled successfully');
    } catch (error) {
      console.error('Error enabling biometric:', error);
      setError('Failed to enable biometric authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePushNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const enabled = await SecurityService.enablePushNotifications();
      if (enabled) {
        setSettings(prev => ({ ...prev, pushNotifications: true }));
        setSuccess('Push notifications enabled successfully');
      } else {
        setError('Push notifications permission denied');
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      setError('Failed to enable push notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      setLoading(true);
      setError(null);

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      await SecurityService.updatePassword(currentPassword, newPassword);
      setSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Security Settings</h1>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          <ExclamationTriangleIcon className="h-5 w-5 inline mr-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
          <ShieldCheckIcon className="h-5 w-5 inline mr-2" />
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Two-Factor Authentication */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <DevicePhoneMobileIcon className="h-6 w-6 text-blue-500 mr-2" />
              <h2 className="text-lg font-medium">Two-Factor Authentication</h2>
            </div>
            <div className="flex items-center">
              <span className={`mr-2 ${
                settings.twoFactor ? 'text-green-500' : 'text-gray-500'
              }`}>
                {settings.twoFactor ? 'Enabled' : 'Disabled'}
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.twoFactor}
                  onChange={() => !settings.twoFactor && handleEnableTwoFactor()}
                  disabled={loading}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          {!settings.twoFactor && (
            <div className="space-y-4">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number"
                className="w-full p-2 border rounded"
              />
              {verificationId && (
                <>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter verification code"
                    className="w-full p-2 border rounded"
                  />
                  <button
                    onClick={handleVerifyTwoFactor}
                    disabled={loading}
                    className="btn-primary"
                  >
                    Verify Code
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Biometric Authentication */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FingerPrintIcon className="h-6 w-6 text-blue-500 mr-2" />
              <h2 className="text-lg font-medium">Biometric Authentication</h2>
            </div>
            <div className="flex items-center">
              <span className={`mr-2 ${
                settings.biometric ? 'text-green-500' : 'text-gray-500'
              }`}>
                {settings.biometric ? 'Enabled' : 'Disabled'}
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.biometric}
                  onChange={() => !settings.biometric && handleEnableBiometric()}
                  disabled={loading}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BellIcon className="h-6 w-6 text-blue-500 mr-2" />
              <h2 className="text-lg font-medium">Security Notifications</h2>
            </div>
            <div className="flex items-center">
              <span className={`mr-2 ${
                settings.pushNotifications ? 'text-green-500' : 'text-gray-500'
              }`}>
                {settings.pushNotifications ? 'Enabled' : 'Disabled'}
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={() => !settings.pushNotifications && handleEnablePushNotifications()}
                  disabled={loading}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-6 w-6 text-blue-500 mr-2" />
            <h2 className="text-lg font-medium">Change Password</h2>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full p-2 border rounded"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full p-2 border rounded"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleUpdatePassword}
              disabled={loading}
              className="btn-primary"
            >
              Update Password
            </button>
          </div>
        </div>

        {/* Security Logs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <ClockIcon className="h-6 w-6 text-blue-500 mr-2" />
            <h2 className="text-lg font-medium">Recent Security Activity</h2>
          </div>

          <div className="space-y-4">
            {securityLogs.map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between border-b pb-2"
              >
                <div>
                  <p className="font-medium">{log.eventType}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(log.timestamp.toDate()).toLocaleString()}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {log.details.userAgent}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
