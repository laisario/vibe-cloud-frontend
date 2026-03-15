// ============================================
// API Types — replace mock implementations in
// src/lib/api/client.ts when connecting to a real backend
// ============================================

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }
  
  export interface ChatRequest {
    message: string;
    conversationId?: string;
  }
  
  export interface ChatResponse {
    reply: string;
    conversationId: string;
  }
  
  export type ServiceStatus = "up" | "down" | "draft";

  export interface InfraService {
    id: string;
    name: string;
    type: "web" | "api" | "database" | "cache" | "worker" | "load-balancer" | "storage";
    description: string;
    status: ServiceStatus;
    provider?: string;
    region?: string;
    estimatedCost?: string;
  }
  
  export interface PreviewResponse {
    services: InfraService[];
  }
  