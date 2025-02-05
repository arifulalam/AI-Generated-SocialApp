import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const useDarkMode = () => {
  const { darkMode, toggleDarkMode } = useTheme();

  // Update meta theme-color when dark mode changes
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        darkMode ? '#1f2937' : '#ffffff'
      );
    }
  }, [darkMode]);

  // Update system UI colors
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      document.querySelector(':root').style.setProperty(
        '--system-ui-color',
        darkMode ? '#1f2937' : '#ffffff'
      );
    }
  }, [darkMode]);

  // Handle system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('darkMode')) {
        toggleDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [toggleDarkMode]);

  return {
    isDark: darkMode,
    toggle: toggleDarkMode,
    enable: () => toggleDarkMode(true),
    disable: () => toggleDarkMode(false),
    // Helper functions for conditional classes
    classes: {
      // Add dark mode variant to a class
      dark: (className) => `${className} dark:${className}`,
      // Toggle between light and dark classes
      toggle: (lightClass, darkClass) => darkMode ? darkClass : lightClass,
      // Combine multiple classes with dark variants
      combine: (...classes) => classes.filter(Boolean).join(' '),
    },
    // Color scheme utilities
    colors: {
      background: darkMode ? '#1f2937' : '#ffffff',
      text: darkMode ? '#f9fafb' : '#111827',
      border: darkMode ? '#374151' : '#e5e7eb',
      primary: darkMode ? '#3b82f6' : '#2563eb',
      secondary: darkMode ? '#6b7280' : '#4b5563',
      accent: darkMode ? '#8b5cf6' : '#7c3aed',
      success: darkMode ? '#10b981' : '#059669',
      warning: darkMode ? '#f59e0b' : '#d97706',
      error: darkMode ? '#ef4444' : '#dc2626',
      info: darkMode ? '#3b82f6' : '#2563eb',
    },
    // Theme object for styled-components or other styling solutions
    theme: {
      colors: {
        bg: {
          primary: darkMode ? '#1f2937' : '#ffffff',
          secondary: darkMode ? '#374151' : '#f3f4f6',
          accent: darkMode ? '#4b5563' : '#e5e7eb',
        },
        text: {
          primary: darkMode ? '#f9fafb' : '#111827',
          secondary: darkMode ? '#e5e7eb' : '#4b5563',
          accent: darkMode ? '#9ca3af' : '#6b7280',
        },
        border: {
          primary: darkMode ? '#374151' : '#e5e7eb',
          secondary: darkMode ? '#4b5563' : '#d1d5db',
        },
        brand: {
          primary: darkMode ? '#3b82f6' : '#2563eb',
          secondary: darkMode ? '#6b7280' : '#4b5563',
          accent: darkMode ? '#8b5cf6' : '#7c3aed',
        },
      },
      shadows: {
        sm: darkMode
          ? '0 1px 2px 0 rgba(0, 0, 0, 0.25)'
          : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: darkMode
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: darkMode
          ? '0 10px 15px -3px rgba(0, 0, 0, 0.35)'
          : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
    },
  };
};

export default useDarkMode;
