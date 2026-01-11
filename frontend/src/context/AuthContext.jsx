import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      try {
        const response = await axios.post(`${API}/auth/verify?token=${token}`);
        if (response.data.valid) {
          setIsAuthenticated(true);
          setUser({ username: response.data.username });
        } else {
          localStorage.removeItem("admin_token");
        }
      } catch (error) {
        localStorage.removeItem("admin_token");
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password,
      });
      
      if (response.data.success) {
        localStorage.setItem("admin_token", response.data.token);
        setIsAuthenticated(true);
        setUser({ username });
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      return { success: false, message: "Login failed" };
    }
  };

  const logout = async () => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      try {
        await axios.post(`${API}/auth/logout?token=${token}`);
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
    localStorage.removeItem("admin_token");
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
