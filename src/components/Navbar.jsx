import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../stores/slices/authSlice';
import { toggleDarkMode, toggleSidebar } from '../stores/slices/uiSlice';
import { auth } from '../config/firebase';
import {
  Bars3Icon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { darkMode } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      dispatch(logout());
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${
      darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
    } shadow-md`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className="ml-4 text-xl font-semibold">Firebase Chat</h1>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => dispatch(toggleDarkMode())}
              className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {darkMode ? (
                <SunIcon className="h-6 w-6" />
              ) : (
                <MoonIcon className="h-6 w-6" />
              )}
            </button>

            <button className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
              <BellIcon className="h-6 w-6" />
            </button>

            <div className="relative group">
              <button className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                <UserCircleIcon className="h-6 w-6" />
                <span>{user?.email}</span>
              </button>
              <div className={`absolute right-0 w-48 mt-2 py-2 ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              } rounded-md shadow-xl hidden group-hover:block`}>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
