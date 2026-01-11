import { useRef, useEffect } from "react";
import { cn } from "../lib/utils";
import { ScrollArea } from "./ui/scroll-area";

const LogTerminal = ({ logs = [], className, maxHeight = "300px" }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (level) => {
    switch (level?.toUpperCase()) {
      case "ERROR":
        return "log-error";
      case "WARNING":
        return "log-warning";
      case "INFO":
      default:
        return "log-info";
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "--:--:--";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div
      className={cn("card log-terminal", className)}
      data-testid="log-terminal"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#262626]">
        <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-[#a3a3a3]">
          Activity Log
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#E50914]" />
          <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
          <div className="w-2 h-2 rounded-full bg-[#46d369]" />
        </div>
      </div>

      <ScrollArea className="h-[250px]" ref={scrollRef}>
        <div className="space-y-1">
          {logs.length === 0 ? (
            <div className="text-[#666] text-sm py-4 text-center font-mono">
              No activity logs yet...
              <span className="terminal-cursor" />
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={log.id || index}
                className="log-line log-entry px-2 py-1 flex items-start gap-3 text-sm"
              >
                <span className="text-[#666] font-mono text-xs shrink-0">
                  [{formatTimestamp(log.timestamp)}]
                </span>
                <span
                  className={cn(
                    "font-mono text-xs uppercase shrink-0 w-14",
                    getLogColor(log.level)
                  )}
                >
                  {log.level || "INFO"}
                </span>
                <span className="text-[#e5e5e5] font-mono text-xs break-all">
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default LogTerminal;
