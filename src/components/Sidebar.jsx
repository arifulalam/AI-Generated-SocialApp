import React from 'react';
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  UserGroupIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const { darkMode } = useSelector((state) => state.ui);

  const navItems = [
    { path: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
    { path: '/chat', icon: ChatBubbleLeftRightIcon, label: 'Chat' },
    { path: '/social', icon: UsersIcon, label: 'Social' },
    { path: '/groups', icon: UserGroupIcon, label: 'Groups' },
    { path: '/settings', icon: CogIcon, label: 'Settings' },
  ];

  return (
    <aside
      className={`w-64 min-h-screen ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
      } shadow-lg transition-all duration-200`}
    >
      <div className="p-4 pt-[80px]">
        <div className="space-y-4">
          {navItems.map((item) => {
            //console.log(item);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`
                }
              >
                <item.icon className="h-6 w-6" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
