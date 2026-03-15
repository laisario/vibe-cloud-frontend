import type { ServiceStatus } from "@/lib/api/types";

interface StatusBadgeProps {
  status: ServiceStatus;
}

const statusStyles: Record<
  ServiceStatus,
  { dot: string; text: string; label: string }
> = {
  up: {
    dot: "bg-success animate-pulse-dot",
    text: "text-success",
    label: "Ativo",
  },
  down: {
    dot: "bg-destructive",
    text: "text-destructive",
    label: "Inativo",
  },
  draft: {
    dot: "bg-muted-foreground/60",
    text: "text-muted-foreground",
    label: "Rascunho",
  },
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { dot, text, label } = statusStyles[status];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className={`text-xs font-medium ${text}`}>{label}</span>
    </span>
  );
};
  
  export default StatusBadge;
  