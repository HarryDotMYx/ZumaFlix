import { Outlet } from "react-router-dom";
import { Mail, Terminal } from "lucide-react";

const GuestLayout = () => {
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
                  EMAIL HISTORY VIEWER
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-4" data-testid="guest-navigation">
              <div className="flex items-center gap-2 px-4 py-2 text-white bg-[#E50914]/10 border-b-2 border-[#E50914]">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Email History
                </span>
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
            Made By HarryDotMYx
          </p>
        </div>
      </footer>
    </div>
  );
};

export default GuestLayout;
