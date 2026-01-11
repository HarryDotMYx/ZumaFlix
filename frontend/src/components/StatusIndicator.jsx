import { cn } from "../lib/utils";

const StatusIndicator = ({ active, label, className }) => {
  return (
    <div className={cn("flex items-center gap-3", className)} data-testid="status-indicator">
      <div
        className={cn(
          "status-dot",
          active ? "status-active pulse-active" : "status-inactive"
        )}
        data-testid={`status-dot-${active ? 'active' : 'inactive'}`}
      />
      <span className="font-mono text-sm tracking-wide">
        {label || (active ? "MONITORING ACTIVE" : "MONITORING STOPPED")}
      </span>
    </div>
  );
};

export default StatusIndicator;
