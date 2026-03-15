import { useRef, useEffect, useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/lib/api/types";
import { sendChatMessage } from "@/lib/api/client";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import SuggestionChips from "./SuggestionChips";
import EmptyState from "./EmptyState";
import LoadingDots from "./LoadingDots";
import { Bot, Zap } from "lucide-react";

interface ChatPanelProps {
  messages: ChatMessageType[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageType[]>>;
  conversationId: string | null;
  setConversationId: (id: string) => void;
  onInfraGenerated: () => void;
}

const ChatPanel = ({
  messages,
  setMessages,
  conversationId,
  setConversationId,
  onInfraGenerated,
}: ChatPanelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    const userMsg: ChatMessageType = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await sendChatMessage({
        message: text,
        conversationId: conversationId ?? undefined,
      });

      if (!conversationId) setConversationId(res.conversationId);

      const assistantMsg: ChatMessageType = {
        id: `msg_${Date.now()}_a`,
        role: "assistant",
        content: res.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      onInfraGenerated();
    } catch {
      const errMsg: ChatMessageType = {
        id: `msg_${Date.now()}_err`,
        role: "assistant",
        content: "Algo deu errado. Tente novamente.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Assistente de Arquitetura
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Descreva seu sistema ou cole uma arquitetura existente
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4"
      >
        {isEmpty ? (
          <EmptyState
            title="Inicie uma conversa"
            description="Descreva a infraestrutura desejada ou cole uma arquitetura existente para gerar Terraform."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-xl bg-chat-assistant">
                  <LoadingDots />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="border-t px-5 py-4 space-y-3">
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
};

export default ChatPanel;
