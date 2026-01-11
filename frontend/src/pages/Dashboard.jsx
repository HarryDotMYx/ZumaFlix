import { useState, useEffect, useCallback } from "react";
import { Mail, CheckCircle, AlertCircle, Play, Pause, RefreshCw, Activity, Users } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import StatCard from "../components/StatCard";
import StatusIndicator from "../components/StatusIndicator";
import LogTerminal from "../components/LogTerminal";
import { Button } from "../components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_emails: 0,
    links_clicked: 0,
    errors: 0,
    household_emails: 0,
    access_code_emails: 0,
    active_accounts: 0,
    is_monitoring: false,
    last_check: null,
  });
  const [logs, setLogs] = useState([]);
  const [recentEmails, setRecentEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, logsRes, emailsRes] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/logs?limit=50`),
        axios.get(`${API}/emails?limit=5`),
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data);
      setRecentEmails(emailsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStartMonitoring = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/monitor/start`);
      toast.success("Monitoring started");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to start monitoring");
    } finally {
      setLoading(false);
    }
  };

  const handleStopMonitoring = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/monitor/stop`);
      toast.success("Monitoring stopped");
      fetchData();
    } catch (error) {
      toast.error("Failed to stop monitoring");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await axios.post(`${API}/monitor/check-now`);
      toast.success("Email check completed");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to check emails");
    } finally {
      setChecking(false);
    }
  };

  const formatLastCheck = (timestamp) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "clicked":
        return <span className="badge badge-success">Clicked</span>;
      case "error":
        return <span className="badge badge-error">Error</span>;
      case "expired":
        return <span className="badge badge-warning">Expired</span>;
      default:
        return <span className="badge badge-default">Detected</span>;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "household_update":
        return <span className="badge badge-default" style={{ background: 'rgba(229,9,20,0.2)', color: '#E50914', border: '1px solid rgba(229,9,20,0.3)' }}>Household</span>;
      case "temporary_access":
        return <span className="badge badge-default" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>Access Code</span>;
      default:
        return <span className="badge badge-default">Other</span>;
    }
  };

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header Section */}
      <div className="hero-gradient -mx-6 -mt-8 px-6 py-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter text-white uppercase mb-2">
              Control Center
            </h1>
            <p className="text-[#a3a3a3] font-mono text-sm">
              LAST CHECK: {formatLastCheck(stats.last_check)}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <StatusIndicator active={stats.is_monitoring} />
            
            <div className="flex gap-2">
              {stats.is_monitoring ? (
                <Button
                  onClick={handleStopMonitoring}
                  disabled={loading}
                  className="btn-secondary flex items-center gap-2"
                  data-testid="stop-monitoring-btn"
                >
                  <Pause className="w-4 h-4" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={handleStartMonitoring}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2"
                  data-testid="start-monitoring-btn"
                >
                  <Play className="w-4 h-4" />
                  Start
                </Button>
              )}
              
              <Button
                onClick={handleCheckNow}
                disabled={checking}
                variant="outline"
                className="btn-secondary flex items-center gap-2"
                data-testid="check-now-btn"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
                Check Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Active Accounts"
          value={stats.active_accounts}
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Total Emails"
          value={stats.total_emails}
          icon={Mail}
          variant="default"
        />
        <StatCard
          title="Household"
          value={stats.household_emails}
          icon={Activity}
          variant="error"
        />
        <StatCard
          title="Access Codes"
          value={stats.access_code_emails}
          icon={Mail}
          variant="warning"
        />
        <StatCard
          title="Links Clicked"
          value={stats.links_clicked}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Errors"
          value={stats.errors}
          icon={AlertCircle}
          variant="error"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Log */}
        <LogTerminal logs={logs} />

        {/* Recent Emails */}
        <div className="card" data-testid="recent-emails-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#262626]">
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-[#a3a3a3]">
              Recent Netflix Emails
            </h3>
            <Mail className="w-4 h-4 text-[#a3a3a3]" />
          </div>

          <div className="space-y-3">
            {recentEmails.length === 0 ? (
              <div className="text-[#666] text-sm py-8 text-center font-mono">
                No Netflix emails detected yet...
              </div>
            ) : (
              recentEmails.map((email, index) => (
                <div
                  key={email.id || index}
                  className="p-3 bg-[#121212] border border-[#262626] hover:border-[#E50914]/30 transition-colors"
                  data-testid={`email-item-${index}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex gap-2">
                      {getTypeBadge(email.email_type)}
                      {getStatusBadge(email.status)}
                    </div>
                  </div>
                  <p className="text-sm text-white font-medium truncate mb-1">
                    {email.subject}
                  </p>
                  <p className="text-xs text-[#666] font-mono">
                    {email.account_name} • {email.recipient}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
