import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import History from "./pages/History";
import AdminLayout from "./components/AdminLayout";
import GuestLayout from "./components/GuestLayout";
import "./App.css";

// Protected route for admin
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#E50914] font-mono">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Guest Route */}
      <Route path="/" element={<GuestLayout />}>
        <Route index element={<History />} />
      </Route>
      
      {/* Admin Login */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      
      {/* Redirect old routes */}
      <Route path="/history" element={<Navigate to="/" replace />} />
      <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0A0A0A',
            border: '1px solid #E50914',
            color: '#e5e5e5',
          },
        }}
      />
    </div>
  );
}

export default App;
