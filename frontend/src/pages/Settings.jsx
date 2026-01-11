import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, TestTube, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Settings = () => {
  const [config, setConfig] = useState({
    email: "",
    password: "",
    imap_server: "imap.gmail.com",
    imap_port: 993,
    polling_interval: 60,
    auto_click: true,
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      if (response.data) {
        setConfig({
          ...response.data,
          password: "", // Don't show masked password
        });
        setHasConfig(true);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  };

  const handleSave = async () => {
    if (!config.email || !config.password) {
      toast.error("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/config`, config);
      toast.success("Configuration saved successfully");
      setHasConfig(true);
      fetchConfig();
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await axios.post(`${API}/config/test`);
      if (response.data.success) {
        toast.success("Connection successful!");
      } else {
        toast.error(`Connection failed: ${response.data.message}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete the configuration?")) {
      return;
    }

    try {
      await axios.delete(`${API}/config`);
      setConfig({
        email: "",
        password: "",
        imap_server: "imap.gmail.com",
        imap_port: 993,
        polling_interval: 60,
        auto_click: true,
      });
      setHasConfig(false);
      toast.success("Configuration deleted");
    } catch (error) {
      toast.error("Failed to delete configuration");
    }
  };

  return (
    <div className="space-y-8" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-[#262626]">
        <div className="w-12 h-12 bg-[#E50914] flex items-center justify-center glow-red">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-black text-3xl tracking-tight text-white uppercase">
            Settings
          </h1>
          <p className="text-[#a3a3a3] text-sm font-mono">
            CONFIGURE IMAP EMAIL MONITORING
          </p>
        </div>
      </div>

      {/* Gmail Setup Instructions */}
      <div className="card bg-[#0A0A0A] border-[#f59e0b]/30">
        <h3 className="font-heading font-bold text-lg text-[#f59e0b] mb-3">
          Gmail Setup Instructions
        </h3>
        <ol className="space-y-2 text-sm text-[#a3a3a3] list-decimal list-inside">
          <li>Enable 2-Factor Authentication on your Google account</li>
          <li>Go to Google Account → Security → App passwords</li>
          <li>Generate a new app password for "Mail"</li>
          <li>Use that 16-character app password below (not your regular password)</li>
          <li>Make sure IMAP is enabled in Gmail settings</li>
        </ol>
      </div>

      {/* Configuration Form */}
      <div className="card">
        <h3 className="font-heading font-bold text-xl text-white mb-6 uppercase tracking-wide">
          IMAP Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email */}
          <div className="form-group">
            <Label htmlFor="email" className="form-label">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              placeholder="your.email@gmail.com"
              className="input-field"
              data-testid="email-input"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <Label htmlFor="password" className="form-label">
              App Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                placeholder="xxxx xxxx xxxx xxxx"
                className="input-field pr-10"
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* IMAP Server */}
          <div className="form-group">
            <Label htmlFor="imap_server" className="form-label">
              IMAP Server
            </Label>
            <Input
              id="imap_server"
              type="text"
              value={config.imap_server}
              onChange={(e) => setConfig({ ...config, imap_server: e.target.value })}
              placeholder="imap.gmail.com"
              className="input-field"
              data-testid="imap-server-input"
            />
          </div>

          {/* IMAP Port */}
          <div className="form-group">
            <Label htmlFor="imap_port" className="form-label">
              IMAP Port
            </Label>
            <Input
              id="imap_port"
              type="number"
              value={config.imap_port}
              onChange={(e) => setConfig({ ...config, imap_port: parseInt(e.target.value) })}
              placeholder="993"
              className="input-field"
              data-testid="imap-port-input"
            />
          </div>

          {/* Polling Interval */}
          <div className="form-group">
            <Label htmlFor="polling_interval" className="form-label">
              Polling Interval (seconds)
            </Label>
            <Input
              id="polling_interval"
              type="number"
              value={config.polling_interval}
              onChange={(e) => setConfig({ ...config, polling_interval: parseInt(e.target.value) })}
              placeholder="60"
              min={10}
              max={3600}
              className="input-field"
              data-testid="polling-interval-input"
            />
          </div>

          {/* Auto Click Toggle */}
          <div className="form-group flex items-center justify-between p-4 bg-[#121212] border border-[#262626]">
            <div>
              <Label className="form-label mb-0">Auto-Click Links</Label>
              <p className="text-xs text-[#666] mt-1">
                Automatically click verification links when detected
              </p>
            </div>
            <Switch
              checked={config.auto_click}
              onCheckedChange={(checked) => setConfig({ ...config, auto_click: checked })}
              data-testid="auto-click-switch"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-[#262626]">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
            data-testid="save-config-btn"
          >
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Save Configuration"}
          </Button>

          <Button
            onClick={handleTest}
            disabled={testing || !hasConfig}
            variant="outline"
            className="btn-secondary flex items-center gap-2"
            data-testid="test-connection-btn"
          >
            <TestTube className="w-4 h-4" />
            {testing ? "Testing..." : "Test Connection"}
          </Button>

          {hasConfig && (
            <Button
              onClick={handleDelete}
              variant="destructive"
              className="flex items-center gap-2 bg-transparent border border-[#b91c1c] text-[#E50914] hover:bg-[#E50914]/10"
              data-testid="delete-config-btn"
            >
              <Trash2 className="w-4 h-4" />
              Delete Configuration
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
