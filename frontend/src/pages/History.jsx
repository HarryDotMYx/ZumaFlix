import { useState, useEffect, useCallback } from "react";
import { Mail, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const History = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/emails?limit=100`);
      setEmails(response.data);
    } catch (error) {
      console.error("Error fetching emails:", error);
      toast.error("Failed to load email history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear all email history?")) {
      return;
    }

    try {
      await axios.delete(`${API}/emails`);
      setEmails([]);
      toast.success("Email history cleared");
    } catch (error) {
      toast.error("Failed to clear history");
    }
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
              {emails.length} NETFLIX EMAILS PROCESSED
            </p>
          </div>
        </div>

        <div className="flex gap-3">
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

          <Button
            onClick={handleClearHistory}
            disabled={emails.length === 0}
            variant="destructive"
            className="flex items-center gap-2 bg-transparent border border-[#b91c1c] text-[#E50914] hover:bg-[#E50914]/10"
            data-testid="clear-history-btn"
          >
            <Trash2 className="w-4 h-4" />
            Clear History
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
              Netflix household verification emails will appear here when detected.
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
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(email.status)}
                        <span className="text-xs text-[#666] font-mono">
                          {formatDate(email.processed_at)}
                        </span>
                      </div>

                      <h4 className="text-white font-semibold mb-2 break-words">
                        {email.subject}
                      </h4>

                      <p className="text-sm text-[#a3a3a3] font-mono mb-2">
                        From: {email.sender}
                      </p>

                      {email.verification_link && (
                        <div className="mt-3 p-3 bg-[#0A0A0A] border border-[#262626]">
                          <p className="text-xs text-[#666] font-mono mb-1 uppercase tracking-wider">
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

                      {email.click_response && (
                        <p className="text-xs text-[#a3a3a3] font-mono mt-2">
                          Response: {email.click_response}
                        </p>
                      )}
                    </div>
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
