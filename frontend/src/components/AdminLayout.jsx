import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Activity, Settings, LogOut, Terminal } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/admin", icon: Activity, label: "Dashboard", end: true },
    { to: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="border-b border-[#262626] bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E50914] flex items-center justify-center glow-red">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-heading font-black text-xl tracking-tight text-white uppercase">
                  ZumaFLIX
                </h1>
                <p className="text-xs text-[#a3a3a3] font-mono tracking-wider">
                  ADMIN PANEL
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1" data-testid="admin-navigation">
              {navItems.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  data-testid={`nav-${label.toLowerCase()}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-all duration-200 ${
                      isActive
                        ? "text-white bg-[#E50914]/10 border-b-2 border-[#E50914]"
                        : "text-[#a3a3a3] hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}

              {/* User info & Logout */}
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-[#262626]">
                <span className="text-sm text-[#a3a3a3] font-mono hidden md:inline">
                  {user?.username}
                </span>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-[#a3a3a3] hover:text-[#E50914] hover:bg-[#E50914]/10"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#262626] bg-[#0A0A0A] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <p className="text-center text-xs text-[#666] font-mono">
            ZUMAFLIX EMAIL AUTOMATION SYSTEM v1.0 - ADMIN
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
