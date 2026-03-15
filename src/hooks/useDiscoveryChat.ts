import { useState, useCallback, useEffect, useRef } from "react";
import type {
  Project,
  DiscoverySession,
  DiscoveryChatMessage,
  ChecklistItem,
  Question,
  Readiness,
} from "@/lib/api/types";
import type { WsIncomingMessage } from "@/lib/api/wsTypes";
import { toast } from "sonner";
import { createDiscoveryWebSocket } from "@/lib/api/wsClient";
import { getContext, getActivity, type ContextResponse, type ActivityEvent } from "@/lib/api/discoveryClient";

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

function initialReadiness(): Readiness {
  return { status: "not_ready", coverage: 0, missing_critical_items: [] };
}

function normalizeSession(
  projectId: string,
  raw: { id?: string; state?: string; project_id?: string }
): DiscoverySession {
  return {
    project_id: raw.project_id ?? projectId,
    session_id: raw.id,
    state:
      (raw.state as DiscoverySession["state"]) ?? "idle",
  };
}

interface UseDiscoveryChatOptions {
  pendingMessage?: string;
  onPendingMessageConsumed?: () => void;
}

export function useDiscoveryChat(
  projectId: string | undefined,
  options?: UseDiscoveryChatOptions
) {
  const { pendingMessage, onPendingMessageConsumed } = options ?? {};
  const [project, setProject] = useState<Project | null>(null);
  const [session, setSession] = useState<DiscoverySession | null>(null);
  const [messages, setMessages] = useState<DiscoveryChatMessage[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [readiness, setReadiness] = useState<Readiness>(initialReadiness());
  const [questions, setQuestions] = useState<Question[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<{
    runId: string;
    content: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const accumulatedRef = useRef<Record<string, string>>({});
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const refresh = useCallback(() => {
    // No-op for WS; reconnection handles recovery. Kept for API compatibility.
  }, []);

  const connect = useCallback(() => {
    if (!projectId) return;

    const ws = createDiscoveryWebSocket(projectId, {
      onMessage: (event) => {
        try {
          const msg = JSON.parse(event.data) as WsIncomingMessage;
          handleMessage(msg);
        } catch {
          // ignore parse errors
        }
      },
      onOpen: () => {
        if (!isMountedRef.current) return;
        setIsReconnecting(false);
        retryCountRef.current = 0;
      },
      onClose: (event) => {
        if (!isMountedRef.current) return;
        wsRef.current = null;
        if (retryCountRef.current < MAX_RETRIES) {
          const delay = Math.min(
            INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCountRef.current),
            MAX_RETRY_DELAY_MS
          );
          retryCountRef.current += 1;
          setIsReconnecting(true);
          retryTimeoutRef.current = setTimeout(() => {
            retryTimeoutRef.current = null;
            connect();
          }, delay);
        } else {
          setError("Conexão perdida. Recarregue a página.");
        }
      },
      onError: () => {
        // Errors often surface via onclose
      },
    });

    wsRef.current = ws;
  }, [projectId]);

  const send = useCallback((payload: object) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const refetchContext = useCallback(() => {
    if (!projectId) return;
    getContext(projectId)
      .then((data) => {
        if (!isMountedRef.current) return;
        setContext(data);
        const proj = data?.project;
        if (proj?.project_name) {
          setProject((prev) =>
            prev ? { ...prev, project_name: proj.project_name!, summary: proj.summary } : prev
          );
        }
      })
      .catch(() => {
        if (isMountedRef.current) setContext(null);
      });
  }, [projectId]);

  const handleMessage = useCallback(
    (msg: WsIncomingMessage) => {
      if (!isMountedRef.current) return;

      switch (msg.type) {
        case "connection.ready": {
          const d = msg.data;
          setSession(normalizeSession(projectId!, d.session as Parameters<typeof normalizeSession>[1]));
          setMessages(d.messages ?? []);
          setChecklist(d.checklist ?? []);
          setReadiness(
            d.readiness
              ? {
                  ...initialReadiness(),
                  ...d.readiness,
                  status: (d.readiness.status as Readiness["status"]) ?? "not_ready",
                  coverage: d.readiness.coverage ?? 0,
                  missing_critical_items:
                    d.readiness.missing_critical_items ??
                    (d.readiness as { missing?: string[] }).missing ??
                    [],
                }
              : initialReadiness()
          );
          setQuestions(d.questions ?? []);
          setProject({ project_id: projectId!, project_name: "" });
          setError(null);
          setIsLoading(false);

          if (pendingMessage?.trim()) {
            setIsSending(true);
            const optimisticUser: DiscoveryChatMessage = {
              id: `opt-${Date.now()}`,
              project_id: projectId!,
              role: "user",
              content: pendingMessage.trim(),
              message_type: "free_text",
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, optimisticUser]);
            send({ type: "message.create", data: { content: pendingMessage.trim() } });
            onPendingMessageConsumed?.();
          }
          break;
        }

        case "message.accepted": {
          // Optional: replace optimistic user message id with server id
          const serverId = msg.data.user_message_id;
          if (serverId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.role === "user" && m.id.startsWith("opt-")
                  ? { ...m, id: serverId }
                  : m
              )
            );
          }
          break;
        }

        case "assistant.response.started": {
          const { run_id } = msg.data;
          accumulatedRef.current[run_id] = "";
          setStreamingMessage({ runId: run_id, content: "" });
          break;
        }

        case "assistant.response.delta": {
          const { run_id, delta } = msg.data;
          const acc = accumulatedRef.current;
          acc[run_id] = (acc[run_id] ?? "") + delta;
          setStreamingMessage((prev) =>
            prev?.runId === run_id ? { runId: run_id, content: acc[run_id] } : prev
          );
          break;
        }

        case "assistant.response.completed": {
          const { run_id, message_id, content } = msg.data;
          delete accumulatedRef.current[run_id];
          setStreamingMessage(null);
          setMessages((prev) => {
            const withoutStream = prev.filter((m) => !m.id.startsWith("streaming-"));
            const assistant: DiscoveryChatMessage = {
              id: message_id,
              project_id: projectId!,
              role: "assistant",
              content,
              message_type: "free_text",
              created_at: new Date().toISOString(),
            };
            return [...withoutStream, assistant];
          });
          setIsSending(false);
          break;
        }

        case "assistant.message.created": {
          const { id, role, content } = msg.data;
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === id);
            if (exists) return prev;
            const assistant: DiscoveryChatMessage = {
              id,
              project_id: projectId!,
              role: role as "assistant",
              content,
              message_type: "free_text",
              created_at: new Date().toISOString(),
            };
            return [...prev, assistant];
          });
          setIsSending(false);
          break;
        }

        case "checklist.progress":
          // Optional: could show progress in UI
          break;

        case "checklist.updated": {
          const { key, status, evidence } = msg.data;
          setChecklist((prev) => {
            const idx = prev.findIndex((c) => c.key === key);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = {
                ...next[idx],
                status: status as ChecklistItem["status"],
                evidence: evidence ?? next[idx].evidence,
              };
              return next;
            }
            return prev;
          });
          if (key === "repo_url" && status === "confirmed") {
            refetchContext();
          }
          break;
        }

        case "readiness.updated": {
          const { status, coverage, missing } = msg.data;
          setReadiness((prev) => ({
            ...prev,
            status: (status as Readiness["status"]) ?? prev.status,
            coverage: coverage ?? prev.coverage,
            missing_critical_items: missing ?? prev.missing_critical_items ?? [],
          }));
          break;
        }

        case "question.asked": {
          const { id, question, priority } = msg.data;
          setQuestions((prev) => {
            if (prev.some((q) => q.id === id)) return prev;
            return [
              ...prev,
              {
                id,
                project_id: projectId,
                question,
                priority,
                status: "open" as const,
              },
            ];
          });
          break;
        }

        case "question.answered": {
          const { id } = msg.data;
          setQuestions((prev) =>
            prev.map((q) => (q.id === id ? { ...q, status: "answered" as const } : q))
          );
          break;
        }

        case "error": {
          const { code, message } = msg.data;
          switch (code) {
            case "NO_SESSION":
              send({ type: "session.start", data: {} });
              break;
            case "CONNECTION_EXISTS":
              toast.error("Outra aba já está aberta para este projeto.");
              break;
            case "EMPTY_MESSAGE":
            case "MESSAGE_TOO_LONG":
              setError(message);
              setMessages((prev) => prev.filter((m) => !m.id.startsWith("opt-")));
              setIsSending(false);
              toast.error(message);
              break;
            default:
              setError(message);
              setIsSending(false);
              toast.error(message);
          }
          break;
        }

        case "pong":
          break;

        case "project.repo.updated": {
          const repoUrl = (msg.data as { repo_url?: string }).repo_url;
          if (repoUrl?.trim()) {
            setContext((prev) =>
              prev
                ? {
                    ...prev,
                    overview: { ...prev.overview, repo_url: repoUrl },
                  }
                : prev
            );
          }
          refetchContext();
          break;
        }

        case "session.state_changed": {
          const state = (msg.data as { state?: string }).state;
          if (state) {
            setSession((prev) =>
              prev ? { ...prev, state: state as DiscoverySession["state"] } : prev
            );
          }
          break;
        }

        case "discovery.panel_updated": {
          refetchContext();
          getActivity(projectId!)
            .then((res) => {
              if (isMountedRef.current && res.events) setActivity(res.events);
            })
            .catch(() => {});
          break;
        }

        default:
          break;
      }
    },
    [projectId, send, pendingMessage, onPendingMessageConsumed, refetchContext]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!projectId || !text.trim()) return;

      setError(null);
      setIsSending(true);

      const optimisticUser: DiscoveryChatMessage = {
        id: `opt-${Date.now()}`,
        project_id: projectId,
        role: "user",
        content: text.trim(),
        message_type: "free_text",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUser]);

      send({ type: "message.create", data: { content: text.trim() } });
    },
    [projectId, send]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    retryCountRef.current = 0;
    connect();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [projectId, connect]);

  useEffect(() => {
    if (!projectId || isLoading) return;
    let cancelled = false;
    getContext(projectId)
      .then((data) => {
        if (!cancelled) {
          setContext(data);
          const proj = data?.project;
          if (proj?.project_name) {
            setProject((prev) =>
              prev ? { ...prev, project_name: proj.project_name!, summary: proj.summary } : prev
            );
          }
        }
      })
      .catch(() => {
        if (!cancelled) setContext(null);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, isLoading, checklist.length]);

  useEffect(() => {
    if (!projectId || isLoading) return;
    let cancelled = false;
    getActivity(projectId)
      .then((res) => {
        if (!cancelled && res.events) setActivity(res.events);
      })
      .catch(() => {
        if (!cancelled) setActivity([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, isLoading, checklist.length]);

  return {
    project,
    session,
    messages,
    checklist,
    readiness,
    questions,
    context,
    activity,
    streamingMessage,
    sendMessage,
    refresh,
    refetchContext,
    isLoading,
    isSending,
    error,
    isReconnecting,
  };
}
