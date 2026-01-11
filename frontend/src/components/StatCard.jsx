import { cn } from "../lib/utils";

const StatCard = ({ title, value, icon: Icon, variant = "default", className }) => {
  const variants = {
    default: "border-[#262626]",
    success: "border-[#46d369]/30",
    error: "border-[#E50914]/30",
    warning: "border-[#f59e0b]/30",
  };

  const iconVariants = {
    default: "text-[#a3a3a3]",
    success: "text-[#46d369]",
    error: "text-[#E50914]",
    warning: "text-[#f59e0b]",
  };

  return (
    <div
      className={cn(
        "card group hover:border-[#E50914]/50",
        variants[variant],
        className
      )}
      data-testid={`stat-card-${title.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] mb-2">
            {title}
          </p>
          <p className="font-heading font-black text-4xl text-white stat-number">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn("p-2 bg-[#121212] group-hover:bg-[#1a1a1a] transition-colors", iconVariants[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
