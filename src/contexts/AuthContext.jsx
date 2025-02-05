import React from 'react'
import { createContext, useContext, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setLoading, setError, logout as logoutAction } from '../stores/slices/authSlice';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector(state => state.auth);

  const signup = async (email, password, displayName) => {
    try {
      dispatch(setLoading(true));
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      dispatch(setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName
      }));
      navigate('/dashboard');
      return userCredential.user;
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const login = async (email, password) => {
    try {
      dispatch(setLoading(true));
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      dispatch(setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName
      }));
      navigate('/dashboard');
      return userCredential.user;
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      dispatch(logoutAction());
      navigate('/');
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch(setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        }));
      } else {
        dispatch(logoutAction());
      }
      dispatch(setLoading(false));
    });

    return unsubscribe;
  }, [dispatch]);

  const value = {
    user,
    signup,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
