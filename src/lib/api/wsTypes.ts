import type {
  DiscoverySession,
  DiscoveryChatMessage,
  ChecklistItem,
  Question,
  Readiness,
} from "./types";

// --- Connection ready (initial state) ---
export interface ConnectionReadyData {
  client_id: string;
  conversation_id: string;
  session: DiscoverySession;
  messages: DiscoveryChatMessage[];
  checklist: ChecklistItem[];
  readiness: Readiness;
  questions: Question[];
}

// --- Incoming events (server -> client) ---
export interface WsConnectionReady {
  type: "connection.ready";
  data: ConnectionReadyData;
}

export interface WsMessageAccepted {
  type: "message.accepted";
  data: { user_message_id: string };
}

export interface WsAssistantResponseStarted {
  type: "assistant.response.started";
  data: { run_id: string };
}

export interface WsAssistantResponseDelta {
  type: "assistant.response.delta";
  data: { run_id: string; delta: string };
}

export interface WsAssistantResponseCompleted {
  type: "assistant.response.completed";
  data: { run_id: string; message_id: string; content: string };
}

export interface WsAssistantMessageCreated {
  type: "assistant.message.created";
  data: { id: string; role: string; content: string };
}

export interface WsChecklistProgress {
  type: "checklist.progress";
  data: { completed: number; total: number; percentage: number };
}

export interface WsChecklistUpdated {
  type: "checklist.updated";
  data: { key: string; status: string; evidence?: string };
}

export interface WsReadinessUpdated {
  type: "readiness.updated";
  data: { status: string; coverage?: number; missing?: string[] };
}

export interface WsQuestionAsked {
  type: "question.asked";
  data: { id: string; question: string; priority?: string };
}

export interface WsQuestionAnswered {
  type: "question.answered";
  data: { id: string; answer: string };
}

export interface WsError {
  type: "error";
  data: { code: string; message: string };
}

export interface WsPong {
  type: "pong";
  data: Record<string, never>;
}

export interface WsProjectRepoUpdated {
  type: "project.repo.updated";
  data: { repo_url?: string };
}

export interface WsSessionStateChanged {
  type: "session.state_changed";
  data: { state?: string };
}

export interface WsDiscoveryPanelUpdated {
  type: "discovery.panel_updated";
  data: Record<string, unknown>;
}

export type WsIncomingMessage =
  | WsConnectionReady
  | WsMessageAccepted
  | WsAssistantResponseStarted
  | WsAssistantResponseDelta
  | WsAssistantResponseCompleted
  | WsAssistantMessageCreated
  | WsChecklistProgress
  | WsChecklistUpdated
  | WsReadinessUpdated
  | WsQuestionAsked
  | WsQuestionAnswered
  | WsError
  | WsPong
  | WsProjectRepoUpdated
  | WsSessionStateChanged
  | WsDiscoveryPanelUpdated;

// --- Outgoing events (client -> server) ---
export interface WsMessageCreate {
  type: "message.create";
  data: { content: string };
}

export interface WsSessionStart {
  type: "session.start";
  data: Record<string, never>;
}

export interface WsChecklistUpdate {
  type: "checklist.update";
  data: { key: string; status: string; evidence?: string };
}

export interface WsQuestionAnswer {
  type: "question.answer";
  data: { question_id: string; answer: string };
}

export interface WsResponseCancel {
  type: "response.cancel";
  data: { run_id: string };
}

export interface WsPing {
  type: "ping";
  data: Record<string, never>;
}

export type WsOutgoingMessage =
  | WsMessageCreate
  | WsSessionStart
  | WsChecklistUpdate
  | WsQuestionAnswer
  | WsResponseCancel
  | WsPing;
