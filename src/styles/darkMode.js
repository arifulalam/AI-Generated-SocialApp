// Common dark mode class combinations for reuse
export const darkModeClasses = {
  // Backgrounds
  background: 'bg-white dark:bg-dark-primary',
  backgroundSecondary: 'bg-gray-50 dark:bg-dark-secondary',
  backgroundAccent: 'bg-gray-100 dark:bg-dark-accent',
  
  // Text colors
  text: 'text-gray-900 dark:text-dark-primary',
  textSecondary: 'text-gray-600 dark:text-dark-secondary',
  textAccent: 'text-gray-500 dark:text-dark-accent',
  
  // Borders
  border: 'border-gray-200 dark:border-dark-700',
  borderAccent: 'border-gray-300 dark:border-dark-600',
  
  // Input fields
  input: `
    bg-white dark:bg-dark-secondary
    text-gray-900 dark:text-dark-primary
    border-gray-300 dark:border-dark-600
    focus:ring-blue-500 dark:focus:ring-blue-400
    focus:border-blue-500 dark:focus:border-blue-400
    placeholder-gray-400 dark:placeholder-dark-400
  `,
  
  // Buttons
  buttonPrimary: `
    bg-blue-500 dark:bg-blue-600
    hover:bg-blue-600 dark:hover:bg-blue-700
    text-white
    focus:ring-blue-500 dark:focus:ring-blue-400
  `,
  buttonSecondary: `
    bg-gray-100 dark:bg-dark-accent
    hover:bg-gray-200 dark:hover:bg-dark-600
    text-gray-700 dark:text-dark-primary
    focus:ring-gray-500 dark:focus:ring-dark-400
  `,
  
  // Cards
  card: `
    bg-white dark:bg-dark-secondary
    shadow-sm dark:shadow-dark-800
    border border-gray-200 dark:border-dark-700
  `,
  
  // Hover effects
  hover: 'hover:bg-gray-50 dark:hover:bg-dark-accent',
  
  // Focus rings
  focusRing: 'focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dark-primary',
  
  // Dividers
  divider: 'border-gray-200 dark:border-dark-700',
  
  // Scrollbar
  scrollbar: `
    scrollbar-thin
    scrollbar-thumb-gray-300 dark:scrollbar-thumb-dark-600
    scrollbar-track-gray-100 dark:scrollbar-track-dark-800
  `,
  
  // Forms
  formLabel: 'text-gray-700 dark:text-dark-secondary',
  formInput: `
    bg-white dark:bg-dark-secondary
    text-gray-900 dark:text-dark-primary
    border-gray-300 dark:border-dark-600
    focus:ring-blue-500 dark:focus:ring-blue-400
    focus:border-blue-500 dark:focus:border-blue-400
  `,
  formSelect: `
    bg-white dark:bg-dark-secondary
    text-gray-900 dark:text-dark-primary
    border-gray-300 dark:border-dark-600
  `,
  formCheckbox: `
    text-blue-500 dark:text-blue-400
    border-gray-300 dark:border-dark-600
    focus:ring-blue-500 dark:focus:ring-blue-400
  `,
  
  // Tables
  table: 'bg-white dark:bg-dark-secondary',
  tableHeader: 'bg-gray-50 dark:bg-dark-accent',
  tableCell: 'border-gray-200 dark:border-dark-700',
  tableRow: 'hover:bg-gray-50 dark:hover:bg-dark-accent',
  
  // Navigation
  nav: 'bg-white dark:bg-dark-primary',
  navItem: `
    text-gray-600 dark:text-dark-secondary
    hover:text-gray-900 dark:hover:text-dark-primary
    hover:bg-gray-50 dark:hover:bg-dark-accent
  `,
  navItemActive: `
    text-blue-500 dark:text-blue-400
    bg-blue-50 dark:bg-blue-900/20
  `,
  
  // Modals
  modal: `
    bg-white dark:bg-dark-secondary
    shadow-xl dark:shadow-dark-800
  `,
  modalOverlay: 'bg-black/50 dark:bg-black/75',
  
  // Tooltips
  tooltip: `
    bg-gray-900 dark:bg-dark-200
    text-white dark:text-dark-900
  `,
  
  // Badges
  badge: {
    success: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400',
    error: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400',
  },
  
  // Alerts
  alert: {
    success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400',
  },
  
  // Loading states
  skeleton: 'bg-gray-200 dark:bg-dark-600 animate-pulse',
  
  // Code blocks
  code: `
    bg-gray-50 dark:bg-dark-800
    text-gray-800 dark:text-dark-200
    border-gray-200 dark:border-dark-700
  `,
};

// Helper function to combine dark mode classes
export const combineClasses = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Helper function to apply dark mode classes conditionally
export const darkModeClass = (baseClass, darkClass) => {
  return `${baseClass} dark:${darkClass}`;
};
