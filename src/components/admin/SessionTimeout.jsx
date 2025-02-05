import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminAuthService } from '../../services/SuperAdminAuthService';

const SessionTimeout = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const navigate = useNavigate();

  const warningThreshold = 5 * 60 * 1000; // Show warning 5 minutes before timeout

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const checkSession = useCallback(() => {
    const sessionInfo = superAdminAuthService.getSessionInfo();
    
    if (!sessionInfo) {
      navigate('/admin/login');
      return;
    }

    const remaining = sessionInfo.remainingTime;
    setTimeRemaining(remaining);

    if (remaining <= warningThreshold) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, [checkSession]);

  const handleExtendSession = () => {
    superAdminAuthService.extendSession();
    setShowWarning(false);
  };

  const handleLogout = () => {
    superAdminAuthService.logout();
    navigate('/admin/login');
  };

  if (!showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full
      flex items-center justify-center">
      <div className="relative mx-auto p-5 w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12
            rounded-full bg-yellow-100">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          
          <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
            Session Timeout Warning
          </h3>
          
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">
              Your session will expire in {formatTime(timeRemaining)}
            </p>
          </div>
          
          <div className="flex justify-center mt-4 space-x-4">
            <button
              onClick={handleExtendSession}
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium
                rounded-md shadow-sm hover:bg-blue-600 focus:outline-none
                focus:ring-2 focus:ring-blue-300"
            >
              Extend Session
            </button>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium
                rounded-md shadow-sm hover:bg-gray-200 focus:outline-none
                focus:ring-2 focus:ring-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeout;
