import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { twoFactorAuthService } from '../../services/TwoFactorAuthService';
import { superAdminAuthService } from '../../services/SuperAdminAuthService';

const TwoFactorAuth = () => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const setup2FA = async () => {
      try {
        // Check if 2FA is already set up
        const session = superAdminAuthService.getSessionInfo();
        if (!session) {
          navigate('/admin/secret-login');
          return;
        }

        // For demo purposes, always generate new secret
        // In production, check if user already has 2FA enabled
        const newSecret = twoFactorAuthService.generateSecret();
        const qrCodeUrl = await twoFactorAuthService.generateQRCode(
          session.username,
          newSecret
        );
        
        setSecret(newSecret);
        setQrCode(qrCodeUrl);
        setBackupCodes(twoFactorAuthService.generateBackupCodes());
        setRecoveryKey(twoFactorAuthService.generateRecoveryKey());
        setIsSetup(true);
      } catch (error) {
        setError('Error setting up 2FA');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    setup2FA();
  }, [navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const isValid = twoFactorAuthService.verifyToken(token, secret);
      
      if (isValid) {
        // In production, save 2FA status to user profile
        navigate('/admin/dashboard');
      } else {
        setError('Invalid verification code');
      }
    } catch (error) {
      setError('Error verifying code');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Two-Factor Authentication
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isSetup ? (
            <div className="space-y-6">
              <div>
                <div className="flex justify-center mb-6">
                  <img
                    src={qrCode}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>

                <p className="text-sm text-gray-600 text-center mb-6">
                  Scan this QR code with your authenticator app
                </p>

                <form onSubmit={handleVerify} className="space-y-6">
                  <div>
                    <label
                      htmlFor="token"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Verification Code
                    </label>
                    <input
                      type="text"
                      id="token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm
                        focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter 6-digit code"
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent
                      rounded-md shadow-sm text-sm font-medium text-white bg-blue-600
                      hover:bg-blue-700 focus:outline-none focus:ring-2
                      focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Verify
                  </button>
                </form>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Backup Codes</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Save these backup codes in a secure place. You can use them to access
                  your account if you lose your authenticator device.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 px-4 py-2 text-sm font-mono text-gray-600
                        rounded border border-gray-200"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Recovery Key</h3>
                <p className="mt-1 text-sm text-gray-600">
                  This is your emergency recovery key. Store it safely - you'll need
                  it if you lose access to your device and backup codes.
                </p>
                <div className="mt-4">
                  <div className="bg-gray-50 px-4 py-2 text-sm font-mono text-gray-600
                    rounded border border-gray-200 break-all">
                    {recoveryKey}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-red-600">Error setting up 2FA. Please try again.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth;
