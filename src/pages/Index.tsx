import { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/api/types";
import { SEEDED_MESSAGES } from "@/lib/api/mock-data";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import PreviewPanel from "@/components/PreviewPanel";

const Index = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(SEEDED_MESSAGES);
  const [conversationId, setConversationId] = useState<string | null>("conv_123");
  const [refreshKey, setRefreshKey] = useState(1);

  const handleInfraGenerated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Chat — 40% on desktop */}
        <div className="flex h-1/2 flex-col border-b lg:h-full lg:w-[40%] lg:border-b-0 lg:border-r">
          <ChatPanel
            messages={messages}
            setMessages={setMessages}
            conversationId={conversationId}
            setConversationId={setConversationId}
            onInfraGenerated={handleInfraGenerated}
          />
        </div>
        {/* Preview — 60% on desktop */}
        <div className="flex-1 overflow-hidden">
          <PreviewPanel
            conversationId={conversationId}
            refreshKey={refreshKey}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
