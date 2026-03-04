'use client';
// AuthContext.js
// This gives the whole app access to the current logged-in user
// I'm using React context so I don't have to pass user down as props everywhere
// Any component can just call useAuth() to get user info or login/logout

import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while we check localStorage on load

  useEffect(() => {
    // when app loads, check if user was already logged in from a previous session
    const savedToken = localStorage.getItem('access_token');
    const savedUser  = localStorage.getItem('user_data');

    if (savedToken && savedUser) {
      try {
        // restore the user object from localStorage
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // if the stored data got corrupted somehow, just clear it
        localStorage.removeItem('user_data');
      }
    }

    setLoading(false);
  }, []);

  // called from the login page when user submits their credentials
  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });

    // backend returns: { status, access_token, data: { user_id, username, email, role } }
    const token    = response.access_token;
    const userData = response.data || response.user || {};

    // normalize so the app always works with same shape regardless of backend changes
    const normalizedUser = {
      id:       userData.user_id || userData.id,
      username: userData.username || userData.email,
      email:    userData.email,
      role:     userData.role || 'viewer',
    };

    // save to localStorage so it survives page refresh
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_data', JSON.stringify(normalizedUser));

    setUser(normalizedUser);
    return response;
  };

  // called when user clicks logout button in the sidebar
  const logout = async () => {
    // try to tell backend to invalidate the token
    // we ignore errors here - even if this fails we still log out locally
    try {
      await authAPI.logout();
    } catch {}

    // clear everything from storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// shortcut hook - just do const { user } = useAuth() in any component
export const useAuth = () => useContext(AuthContext);