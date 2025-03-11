"use client";
import { useState } from "react";
import ChatMessageBubble from "./ChatMessageBubble";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWindow({ endpoint }: { endpoint: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, newMessage] }),
    });

    const reader = response.body?.getReader();
    if (!reader) return;
    let assistantContent = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantContent += new TextDecoder().decode(value);
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== "assistant" || !prev.includes(newMessage)), // Avoid duplicates
        { role: "assistant", content: assistantContent },
      ]);
    }
  };

  return (
    <div className="bg-[var(--bubble-assistant)] rounded-xl shadow-lg flex flex-col h-[80vh] max-h-[600px] border border-gray-800">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            Start chatting with DeFi Maestro...
          </div>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessageBubble key={idx} role={msg.role} content={msg.content} />
          ))
        )}
      </div>
      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center bg-[var(--input-bg)] rounded-lg p-2 shadow-inner">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-transparent text-[var(--foreground)] placeholder-gray-500 outline-none p-2 text-sm"
            placeholder="Ask me anything about Aptos DeFi..."
          />
          <button
            onClick={sendMessage}
            className="p-2 bg-[var(--send-btn)] rounded-full hover:bg-green-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-5 h-5 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}