import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, TestTube, Trash2, Eye, EyeOff, Plus, Mail, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Settings = () => {
  const [accounts, setAccounts] = useState([]);
  const [monitoringConfig, setMonitoringConfig] = useState({
    polling_interval: 60,
    auto_click: true,
  });
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    email: "",
    password: "",
    imap_server: "imap.gmail.com",
    imap_port: 993,
    is_active: true,
  });

  useEffect(() => {
    fetchAccounts();
    fetchMonitoringConfig();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API}/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchMonitoringConfig = async () => {
    try {
      const response = await axios.get(`${API}/config/monitoring`);
      setMonitoringConfig(response.data);
    } catch (error) {
      console.error("Error fetching monitoring config:", error);
    }
  };

  const handleSaveAccount = async () => {
    if (!newAccount.name || !newAccount.email || !newAccount.password) {
      toast.error("Name, email and password are required");
      return;
    }

    setLoading(true);
    try {
      if (editingAccount) {
        await axios.put(`${API}/accounts/${editingAccount.id}`, newAccount);
        toast.success("Account updated");
      } else {
        await axios.post(`${API}/accounts`, newAccount);
        toast.success("Account added");
      }
      setDialogOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      toast.error("Failed to save account");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm("Are you sure you want to delete this account?")) {
      return;
    }

    try {
      await axios.delete(`${API}/accounts/${accountId}`);
      toast.success("Account deleted");
      fetchAccounts();
    } catch (error) {
      toast.error("Failed to delete account");
    }
  };

  const handleTestConnection = async (accountId) => {
    try {
      const response = await axios.post(`${API}/accounts/${accountId}/test`);
      if (response.data.success) {
        toast.success("Connection successful!");
      } else {
        toast.error(`Connection failed: ${response.data.message}`);
      }
    } catch (error) {
      toast.error("Connection test failed");
    }
  };

  const handleToggleActive = async (account) => {
    try {
      await axios.put(`${API}/accounts/${account.id}`, {
        ...account,
        password: "", // Will be ignored if empty on backend
        is_active: !account.is_active,
      });
      fetchAccounts();
      toast.success(`Account ${!account.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error("Failed to update account");
    }
  };

  const handleSaveMonitoringConfig = async () => {
    try {
      await axios.post(`${API}/config/monitoring`, monitoringConfig);
      toast.success("Monitoring settings saved");
    } catch (error) {
      toast.error("Failed to save monitoring settings");
    }
  };

  const resetForm = () => {
    setNewAccount({
      name: "",
      email: "",
      password: "",
      imap_server: "imap.gmail.com",
      imap_port: 993,
      is_active: true,
    });
    setEditingAccount(null);
    setShowPassword(false);
  };

  const openEditDialog = (account) => {
    setEditingAccount(account);
    setNewAccount({
      name: account.name,
      email: account.email,
      password: "",
      imap_server: account.imap_server,
      imap_port: account.imap_port,
      is_active: account.is_active,
    });
    setDialogOpen(true);
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
            MANAGE EMAIL ACCOUNTS & MONITORING
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
          <li>Use that 16-character app password (not your regular password)</li>
          <li>Make sure IMAP is enabled in Gmail settings</li>
        </ol>
      </div>

      {/* Email Accounts Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading font-bold text-xl text-white uppercase tracking-wide">
            Email Accounts
          </h3>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="btn-primary flex items-center gap-2" data-testid="add-account-btn">
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-[#262626] text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading font-bold text-xl uppercase">
                  {editingAccount ? "Edit Account" : "Add Email Account"}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 pt-4">
                <div className="form-group">
                  <Label htmlFor="name" className="form-label">Account Name</Label>
                  <Input
                    id="name"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    placeholder="e.g., Personal Gmail"
                    className="input-field"
                    data-testid="account-name-input"
                  />
                </div>

                <div className="form-group">
                  <Label htmlFor="email" className="form-label">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAccount.email}
                    onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                    placeholder="your.email@gmail.com"
                    className="input-field"
                    data-testid="account-email-input"
                  />
                </div>

                <div className="form-group">
                  <Label htmlFor="password" className="form-label">
                    App Password {editingAccount && "(leave empty to keep current)"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={newAccount.password}
                      onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="input-field pr-10"
                      data-testid="account-password-input"
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <Label htmlFor="imap_server" className="form-label">IMAP Server</Label>
                    <Input
                      id="imap_server"
                      value={newAccount.imap_server}
                      onChange={(e) => setNewAccount({ ...newAccount, imap_server: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="imap_port" className="form-label">Port</Label>
                    <Input
                      id="imap_port"
                      type="number"
                      value={newAccount.imap_port}
                      onChange={(e) => setNewAccount({ ...newAccount, imap_port: parseInt(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAccount}
                    disabled={loading}
                    className="btn-primary"
                    data-testid="save-account-btn"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? "Saving..." : "Save Account"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-[#666]">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-mono">No email accounts configured</p>
            <p className="text-sm mt-2">Add an account to start monitoring Netflix emails</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`p-4 bg-[#121212] border transition-colors ${
                  account.is_active ? 'border-[#46d369]/30' : 'border-[#262626]'
                }`}
                data-testid={`account-item-${account.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      account.is_active ? 'bg-[#46d369] shadow-[0_0_10px_#46d369]' : 'bg-[#333]'
                    }`} />
                    <div>
                      <h4 className="text-white font-semibold">{account.name}</h4>
                      <p className="text-sm text-[#a3a3a3] font-mono">{account.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(account)}
                      className={account.is_active ? 'text-[#46d369]' : 'text-[#666]'}
                      title={account.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {account.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestConnection(account.id)}
                      className="text-[#a3a3a3] hover:text-white"
                      data-testid={`test-account-${account.id}`}
                    >
                      <TestTube className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(account)}
                      className="text-[#a3a3a3] hover:text-white"
                    >
                      <SettingsIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAccount(account.id)}
                      className="text-[#666] hover:text-[#E50914]"
                      data-testid={`delete-account-${account.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monitoring Settings */}
      <div className="card">
        <h3 className="font-heading font-bold text-xl text-white mb-6 uppercase tracking-wide">
          Monitoring Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-group">
            <Label htmlFor="polling_interval" className="form-label">
              Polling Interval (seconds)
            </Label>
            <Input
              id="polling_interval"
              type="number"
              value={monitoringConfig.polling_interval}
              onChange={(e) => setMonitoringConfig({ ...monitoringConfig, polling_interval: parseInt(e.target.value) })}
              min={10}
              max={3600}
              className="input-field"
              data-testid="polling-interval-input"
            />
          </div>

          <div className="form-group flex items-center justify-between p-4 bg-[#121212] border border-[#262626]">
            <div>
              <Label className="form-label mb-0">Auto-Click Household Links</Label>
              <p className="text-xs text-[#666] mt-1">
                Automatically click "Yes, this was me" verification links
              </p>
            </div>
            <Switch
              checked={monitoringConfig.auto_click}
              onCheckedChange={(checked) => setMonitoringConfig({ ...monitoringConfig, auto_click: checked })}
              data-testid="auto-click-switch"
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[#262626]">
          <Button
            onClick={handleSaveMonitoringConfig}
            className="btn-primary flex items-center gap-2"
            data-testid="save-monitoring-config-btn"
          >
            <Save className="w-4 h-4" />
            Save Monitoring Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
