import React, { createContext, useContext, useState, useEffect } from "react";
import { getToken, getUser, login as apiLogin, signup as apiSignup, logout as apiLogout } from "@/lib/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const [currentUser, setCurrentUser] = useState(getUser());
  
  useEffect(() => {
    setIsAuthenticated(!!getToken());
    setCurrentUser(getUser());
  }, []);

  const login = async (username, password) => {
    const res = await apiLogin(username, password);
    setIsAuthenticated(true);
    setCurrentUser(res.user || getUser());
    return res;
  };

  const signup = async (username, password) => {
    const res = await apiSignup(username, password);
    return res;
  };

  const logout = () => {
    apiLogout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
