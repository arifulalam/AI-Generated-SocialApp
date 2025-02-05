import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './stores';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import Register from './pages/Registration';
import Dashboard from './pages/Dashboard';
import Social from './pages/Social';
import Landing from './pages/Landing';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? <Navigate to="/dashboard" /> : children;
};

const AppContent = () => {
  const { darkMode, sidebarOpen } = useSelector((state) => state.ui);
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {isAuthenticated && <Navbar />}
      <div className="flex">
        {isAuthenticated && sidebarOpen && <Sidebar />}
        <main className={`flex-1 ${isAuthenticated ? 'p-4 mt-16' : ''} transition-all duration-200`}>
          <Routes>
            <Route path="/" element={
              <PublicRoute>
                <Landing />
              </PublicRoute>
            } />
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/social" element={
              <PrivateRoute>
                <Social />
              </PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Router>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </Router>
      </PersistGate>
    </Provider>
  );
};

export default App;
