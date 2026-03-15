import { useState, useEffect, useCallback } from "react";
import type {
  DiscoverySession,
  ChecklistItem,
  Readiness,
  Question,
  DiscoveryChatMessage,
} from "@/lib/api/types";
import type { ContextResponse } from "@/lib/api/discoveryClient";
import { linkRepo, startArchitecture } from "@/lib/api/discoveryClient";
import ReadinessPanel from "./ReadinessPanel";
import ChecklistPanel from "./ChecklistPanel";
import WhatWeUnderstandPanel from "./WhatWeUnderstandPanel";
import NextBestStepPanel from "./NextBestStepPanel";
import RecentActivityPanel from "./RecentActivityPanel";
import PhasePipeline from "./PhasePipeline";
import DiagramsPanel from "./DiagramsPanel";
import ReviewPanel from "./ReviewPanel";
import TerraformPanel from "./TerraformPanel";
import GitHubRepoPanel from "./GitHubRepoPanel";
import { isPhaseReady, type PhaseKey } from "./PhasePipeline";
import { Button } from "@/components/ui/button";

interface DiscoveryRightPanelProps {
  projectId: string;
  session: DiscoverySession | null;
  checklist: ChecklistItem[];
  readiness: Readiness | null;
  questions?: Question[];
  messages?: DiscoveryChatMessage[];
  context?: ContextResponse | null;
  activity?: Array<{ type: string; label: string; timestamp: string }>;
  projectName?: string;
  projectSummary?: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  refetchContext?: () => void;
}

function getProjectFromContext(context: ContextResponse | null | undefined): {
  projectName?: string;
  projectSummary?: string;
} {
  const proj = context?.project;
  return {
    projectName: proj?.project_name,
    projectSummary: proj?.summary,
  };
}

function getLastAssistantMessage(messages: DiscoveryChatMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i].content;
  }
  return undefined;
}

const DiscoveryRightPanel = ({
  projectId,
  session,
  checklist,
  readiness,
  questions = [],
  messages = [],
  context,
  activity = [],
  projectName: propProjectName,
  projectSummary: propProjectSummary,
  isLoading,
  error,
  onRetry,
  refetchContext,
}: DiscoveryRightPanelProps) => {
  const [selectedPhase, setSelectedPhase] = useState<PhaseKey>("discovery");
  const [isLinkingRepo, setIsLinkingRepo] = useState(false);
  const [linkRepoError, setLinkRepoError] = useState<string | null>(null);
  const [architectureTriggered, setArchitectureTriggered] = useState(false);

  const hasRepoUrl = !!(
    context?.repo_url?.trim() ||
    checklist.find(
      (c) =>
        (c.key === "repo_url" || c.key === "repository") &&
        c.status === "confirmed"
    )?.evidence?.trim()
  );

  const isReadyForArchitecture =
    (readiness?.status === "maybe_ready" ||
      readiness?.status === "ready_for_architecture") &&
    hasRepoUrl;

  const repoUrl =
    context?.repo_url?.trim() ||
    checklist.find(
      (c) =>
        (c.key === "repo_url" || c.key === "repository") &&
        c.status === "confirmed"
    )?.evidence?.trim() ||
    null;

  const currentState = session?.state ?? null;
  const isArchitectureInProgress =
    architectureTriggered || currentState === "architecture_in_progress";

  const handleLinkRepo = useCallback(
    async (url: string) => {
      setIsLinkingRepo(true);
      setLinkRepoError(null);
      try {
        await linkRepo(projectId, url);
        refetchContext?.();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Não foi possível vincular o repositório.";
        setLinkRepoError(msg);
        throw e;
      } finally {
        setIsLinkingRepo(false);
      }
    },
    [projectId, refetchContext]
  );

  const handleStartArchitecture = useCallback(async () => {
    try {
      await startArchitecture(projectId);
      setArchitectureTriggered(true);
      refetchContext?.();
    } catch {
      // Error handled by DiagramsPanel or could add toast
    }
  }, [projectId, refetchContext]);
  const firstReadyPhase: PhaseKey = (() => {
    const keys: PhaseKey[] = ["discovery", "architecture", "review", "terraform"];
    return keys.find((k) => isPhaseReady(k, readiness, currentState, isReadyForArchitecture)) ?? "discovery";
  })();

  useEffect(() => {
    if (!isPhaseReady(selectedPhase, readiness, currentState, isReadyForArchitecture)) {
      setSelectedPhase(firstReadyPhase);
    }
  }, [selectedPhase, readiness, currentState, isReadyForArchitecture, firstReadyPhase]);

  const { projectName: ctxProjectName, projectSummary: ctxProjectSummary } =
    getProjectFromContext(context);
  const projectName = propProjectName ?? ctxProjectName;
  const projectSummary = propProjectSummary ?? ctxProjectSummary;
  const lastAssistantMessage = getLastAssistantMessage(messages);

  return (
    <div className="flex h-full flex-col bg-surface-sunken">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-5">
          <PhasePipeline
            currentState={currentState}
            readiness={readiness}
            isReadyForArchitecture={isReadyForArchitecture}
            selectedPhase={selectedPhase}
            onPhaseSelect={setSelectedPhase}
          />

          <div className="mt-5">
            {selectedPhase === "discovery" && (
              <>
                {error ? (
                  <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <GitHubRepoPanel
                      projectId={projectId}
                      repoUrl={repoUrl}
                      onRepoLinked={refetchContext}
                      isLoading={isLoading}
                      isLinking={isLinkingRepo}
                      linkError={linkRepoError}
                      onLinkRepo={handleLinkRepo}
                    />

                    <WhatWeUnderstandPanel
                      checklist={checklist}
                      readiness={readiness}
                      context={context}
                      projectName={projectName}
                      projectSummary={projectSummary}
                    />

                    <NextBestStepPanel
                      questions={questions}
                      readiness={readiness}
                      checklist={checklist}
                      lastAssistantMessage={lastAssistantMessage}
                      nextBestStep={context?.next_best_step}
                    />

                    <ReadinessPanel readiness={readiness} />
                    <ChecklistPanel checklist={checklist} />

                    <RecentActivityPanel
                      checklist={checklist}
                      readiness={readiness}
                      messages={messages}
                      activityEvents={activity}
                    />
                  </div>
                )}
              </>
            )}

            {selectedPhase === "review" && (
              <div className="min-h-[200px]">
                <ReviewPanel projectId={projectId} />
              </div>
            )}

            {selectedPhase === "architecture" && (
              <div className="min-h-[200px]">
                <DiagramsPanel
                  projectId={projectId}
                  canStartArchitecture={isReadyForArchitecture}
                  architectureStatus={
                    isArchitectureInProgress ? "in_progress" : "not_started"
                  }
                  onStartArchitecture={handleStartArchitecture}
                />
              </div>
            )}

            {selectedPhase === "terraform" && (
              <div className="min-h-[200px]">
                <TerraformPanel projectId={projectId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoveryRightPanel;
