import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const DarkModeTransition = ({ children }) => {
  const { darkMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Wait until after client-side hydration to show
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`
        transition-colors duration-300 ease-in-out
        min-h-screen
        ${darkMode ? 'dark bg-dark-primary' : 'bg-white'}
      `}
    >
      {/* Theme Transition Overlay */}
      <div
        className={`
          fixed inset-0 pointer-events-none
          transition-opacity duration-300
          ${darkMode ? 'opacity-0' : 'opacity-100'}
          bg-white
        `}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* System UI Color Handler */}
      <style jsx global>{`
        @media (display-mode: standalone) {
          :root {
            --system-ui-color: ${darkMode ? '#1f2937' : '#ffffff'};
          }
        }

        /* Smooth scrollbar color transition */
        * {
          scrollbar-color: ${darkMode ? '#4b5563 #1f2937' : '#9ca3af #f3f4f6'};
        }

        /* Smooth selection color transition */
        ::selection {
          background-color: ${darkMode ? '#3b82f6' : '#2563eb'};
          color: ${darkMode ? '#ffffff' : '#ffffff'};
        }

        /* Smooth focus ring color transition */
        *:focus {
          outline-color: ${darkMode ? '#3b82f6' : '#2563eb'};
        }

        /* Smooth placeholder color transition */
        ::placeholder {
          color: ${darkMode ? '#6b7280' : '#9ca3af'};
          transition: color 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default DarkModeTransition;
