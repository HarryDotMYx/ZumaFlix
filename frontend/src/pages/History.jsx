import { useState, useEffect, useCallback } from "react";
import { Mail, ExternalLink, RefreshCw, Key, Home, Filter } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const History = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all" 
        ? `${API}/emails?limit=100`
        : `${API}/emails?limit=100&email_type=${filter}`;
      const response = await axios.get(url);
      setEmails(response.data);
    } catch (error) {
      console.error("Error fetching emails:", error);
      toast.error("Failed to load email history");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

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
        return (
          <span className="badge flex items-center gap-1" style={{ background: 'rgba(229,9,20,0.2)', color: '#E50914', border: '1px solid rgba(229,9,20,0.3)' }}>
            <Home className="w-3 h-3" />
            Household Update
          </span>
        );
      case "temporary_access":
        return (
          <span className="badge flex items-center gap-1" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
            <Key className="w-3 h-3" />
            Temporary Access
          </span>
        );
      default:
        return <span className="badge badge-default">Other</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-8" data-testid="history-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#262626]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#E50914] flex items-center justify-center glow-red">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-black text-3xl tracking-tight text-white uppercase">
              Email History
            </h1>
            <p className="text-[#a3a3a3] text-sm font-mono">
              {emails.length} NETFLIX EMAILS FOUND
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#a3a3a3]" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px] bg-[#121212] border-[#262626] text-white" data-testid="email-type-filter">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0A0A] border-[#262626]">
                <SelectItem value="all" className="text-white hover:bg-[#262626]">All Emails</SelectItem>
                <SelectItem value="household_update" className="text-white hover:bg-[#262626]">Household Updates</SelectItem>
                <SelectItem value="temporary_access" className="text-white hover:bg-[#262626]">Temporary Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={fetchEmails}
            disabled={loading}
            variant="outline"
            className="btn-secondary flex items-center gap-2"
            data-testid="refresh-history-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Email List */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-[#E50914] animate-spin mx-auto mb-4" />
            <p className="text-[#a3a3a3] font-mono">Loading email history...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-[#333] mx-auto mb-4" />
            <p className="text-[#666] font-mono text-lg mb-2">No emails found</p>
            <p className="text-[#444] text-sm">
              Netflix emails will appear here when detected.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {emails.map((email, index) => (
                <div
                  key={email.id || index}
                  className="p-4 bg-[#121212] border border-[#262626] hover:border-[#E50914]/30 transition-colors"
                  data-testid={`history-email-${index}`}
                >
                  <div className="flex flex-col gap-4">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {getTypeBadge(email.email_type)}
                      {getStatusBadge(email.status)}
                      <span className="text-xs text-[#666] font-mono ml-auto">
                        {formatDate(email.processed_at)}
                      </span>
                    </div>

                    {/* Subject */}
                    <h4 className="text-white font-semibold break-words">
                      {email.subject}
                    </h4>

                    {/* Meta Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <p className="text-[#a3a3a3] font-mono">
                        <span className="text-[#666]">From:</span> {email.sender}
                      </p>
                      <p className="text-[#a3a3a3] font-mono">
                        <span className="text-[#666]">To:</span> {email.recipient}
                      </p>
                      <p className="text-[#a3a3a3] font-mono">
                        <span className="text-[#666]">Account:</span> {email.account_name}
                      </p>
                    </div>

                    {/* Verification Link (for Household emails) */}
                    {email.verification_link && (
                      <div className="mt-2 p-3 bg-[#0A0A0A] border border-[#262626]">
                        <p className="text-xs text-[#666] font-mono mb-1 uppercase tracking-wider flex items-center gap-2">
                          <Home className="w-3 h-3" />
                          Verification Link:
                        </p>
                        <a
                          href={email.verification_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#E50914] font-mono break-all hover:underline flex items-start gap-2"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
                          {email.verification_link}
                        </a>
                      </div>
                    )}

                    {/* Access Code (for Temporary Access emails) */}
                    {email.access_code && (
                      <div className="mt-2 p-3 bg-[#0A0A0A] border border-[#818cf8]/30">
                        <p className="text-xs text-[#666] font-mono mb-1 uppercase tracking-wider flex items-center gap-2">
                          <Key className="w-3 h-3 text-[#818cf8]" />
                          Temporary Access Code:
                        </p>
                        <p className="text-2xl font-mono font-bold text-[#818cf8] tracking-widest">
                          {email.access_code}
                        </p>
                        {email.device_info && (
                          <p className="text-xs text-[#666] font-mono mt-2">
                            Device: {email.device_info}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Click Response */}
                    {email.click_response && (
                      <p className="text-xs text-[#a3a3a3] font-mono">
                        Response: {email.click_response}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default History;
