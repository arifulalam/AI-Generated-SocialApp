import React from 'react'
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 text-white">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">Welcome to ChatApp</h1>
        <p className="text-xl mb-8">Connect with friends and share moments instantly</p>
        
        <div className="space-x-4">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary">
                Login
              </Link>
              <Link to="/register" className="btn bg-white text-blue-600 hover:bg-gray-100">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4">
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-2">Real-time Chat</h3>
          <p>Instant messaging with friends</p>
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-2">File Sharing</h3>
          <p>Share images, videos, and more</p>
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-2">Video Calls</h3>
          <p>Face-to-face conversations</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
