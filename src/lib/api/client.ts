// ============================================
// Mock API Client
// Replace the implementations below with real
// fetch/axios calls when connecting to a backend.
// ============================================

import type { ChatRequest, ChatResponse, PreviewResponse } from "./types";
import { SEEDED_SERVICES } from "./mock-data";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POST /api/chat
 * Send a message and receive an AI reply.
 */
export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  // --- MOCK: replace with real API call ---
  await delay(1500 + Math.random() * 1000);

  const reply =
    "I've analyzed your architecture and generated the suggested infrastructure. " +
    "The services are now visible in the preview panel. Each component has been configured " +
    "with sensible defaults for your stack. Would you like me to adjust any of the services or generate the Terraform output?";

  return {
    reply,
    conversationId: req.conversationId ?? `conv_${Date.now()}`,
  };
}

/**
 * GET /api/preview/:conversationId
 * Fetch generated infrastructure services.
 */
export async function fetchPreview(_conversationId: string): Promise<PreviewResponse> {
  // --- MOCK: replace with real API call ---
  await delay(800);

  return { services: SEEDED_SERVICES };
}

/**
 * POST /api/terraform/apply
 * Apply Terraform to provision infrastructure.
 */
export async function applyTerraform(_conversationId: string): Promise<void> {
  // --- MOCK: replace with real API call ---
  await delay(2000);
}
