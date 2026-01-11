import { Outlet, NavLink } from "react-router-dom";
import { Activity, Settings, Mail, Terminal } from "lucide-react";

const Layout = () => {
  const navItems = [
    { to: "/", icon: Activity, label: "Dashboard" },
    { to: "/history", icon: Mail, label: "Email History" },
    { to: "/settings", icon: Settings, label: "Settings" },
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
                  Netflix Ops
                </h1>
                <p className="text-xs text-[#a3a3a3] font-mono tracking-wider">
                  HOUSEHOLD AUTOMATION
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1" data-testid="main-navigation">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
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
            NETFLIX HOUSEHOLD AUTOMATION SYSTEM v1.0
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
