import type { ArchitectureUIData } from "@/lib/api/discoveryClient";
import ArchitectureDiagram from "./ArchitectureDiagram";
import { Zap } from "lucide-react";

interface PerformanceArchitecturePanelProps {
  data: ArchitectureUIData["performance"];
}

export default function PerformanceArchitecturePanel({
  data,
}: PerformanceArchitecturePanelProps) {
  if (!data.nodes.length) return null;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Arquitetura performance
          </h4>
          {data.description && (
            <p className="text-[11px] text-muted-foreground">
              {data.description}
            </p>
          )}
          {data.estimatedCost && (
            <p className="mt-0.5 text-[11px] font-medium text-foreground">
              Custo estimado: {data.estimatedCost}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4">
        <ArchitectureDiagram nodes={data.nodes} edges={data.edges} />
      </div>
    </div>
  );
}
