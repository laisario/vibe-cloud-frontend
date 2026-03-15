import { useState, useEffect, useCallback } from "react";
import type { InfraService, ServiceStatus } from "@/lib/api/types";
import { fetchPreview, applyTerraform } from "@/lib/api/client";
import {
  createInitialStatusMap,
  setServiceStatus,
  type StatusMap,
} from "@/lib/infra/status";
import { Button } from "@/components/ui/button";
import InfrastructureGraph from "./InfrastructureGraph";
import PreviewSkeleton from "./PreviewSkeleton";
import EmptyState from "./EmptyState";
import { LayoutGrid, Loader2 } from "lucide-react";

interface PreviewPanelProps {
  conversationId: string | null;
  refreshKey: number;
}

const PreviewPanel = ({ conversationId, refreshKey }: PreviewPanelProps) => {
  const [services, setServices] = useState<InfraService[]>([]);
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isApplyingTerraform, setIsApplyingTerraform] = useState(false);

  const handleExecutarTerraform = useCallback(async () => {
    if (!conversationId) return;
    setIsApplyingTerraform(true);
    try {
      await applyTerraform(conversationId);
      setStatusMap((prev) => {
        const next = { ...prev };
        for (const svc of services) {
          if (prev[svc.id] === "draft") {
            next[svc.id] = "up";
          }
        }
        return next;
      });
    } finally {
      setIsApplyingTerraform(false);
    }
  }, [conversationId, services]);

  useEffect(() => {
    if (!conversationId) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchPreview(conversationId);
        const svcs = data.services;
        setServices(svcs);
        // Default status to "draft" for preview services; real backend can replace later
        setStatusMap(createInitialStatusMap(svcs.map((s) => s.id), "draft"));
        setHasLoaded(true);
      } catch {
        // handle error
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [conversationId, refreshKey]);

  const setServiceStatusLocal = useCallback((serviceId: string, status: ServiceStatus) => {
    setStatusMap((prev) => setServiceStatus(prev, serviceId, status));
  }, []);

  return (
    <div className="flex h-full flex-col bg-surface-sunken">
      {/* Header */}
      <div className="border-b bg-card px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Preview da Infraestrutura
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasLoaded
                ? `${services.length} serviços gerados`
                : "Aguardando entrada de arquitetura"}
            </p>
          </div>
          {hasLoaded && services.length > 0 && (
            <Button
              onClick={handleExecutarTerraform}
              disabled={isApplyingTerraform}
              size="sm"
            >
              {isApplyingTerraform ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Executando...
                </>
              ) : (
                "Executar Terraform"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="p-5">
            <PreviewSkeleton />
          </div>
        ) : !hasLoaded ? (
          <div className="flex flex-1 items-center justify-center p-5">
            <EmptyState
              title="Nenhuma infraestrutura ainda"
              description="Envie uma mensagem descrevendo sua arquitetura para gerar um preview."
            />
          </div>
        ) : (
          <div className="h-full min-h-[400px] animate-fade-in">
            <InfrastructureGraph
              services={services}
              statusMap={statusMap}
              onStatusChange={setServiceStatusLocal}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;