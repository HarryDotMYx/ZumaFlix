import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate("/admin");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      toast.success("Login successful");
      navigate("/admin");
    } else {
      toast.error(result.message || "Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4" data-testid="login-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-14 h-14 bg-[#E50914] flex items-center justify-center glow-red">
            <Terminal className="w-7 h-7 text-white" />
          </div>
          <div className="text-left">
            <h1 className="font-heading font-black text-2xl tracking-tight text-white uppercase">
              ZumaFLIX
            </h1>
            <p className="text-xs text-[#a3a3a3] font-mono tracking-wider">
              ADMIN LOGIN
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="card">
          <h2 className="font-heading font-bold text-xl text-white mb-6 uppercase tracking-wide text-center">
            Sign In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <Label htmlFor="username" className="form-label flex items-center gap-2">
                <User className="w-4 h-4" />
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="input-field"
                data-testid="username-input"
              />
            </div>

            <div className="form-group">
              <Label htmlFor="password" className="form-label flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="input-field"
                data-testid="password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
              data-testid="login-submit-btn"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
