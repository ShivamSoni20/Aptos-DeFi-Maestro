interface ChatMessageBubbleProps {
	role: "user" | "assistant";
	content: string;
  }
  
  export default function ChatMessageBubble({ role, content }: ChatMessageBubbleProps) {
	return (
	  <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
		<div
		  className={`max-w-[70%] p-3 rounded-lg text-sm ${
			role === "user"
			  ? "bg-[var(--bubble-user)] text-white"
			  : "bg-gradient-to-br from-[var(--bubble-assistant)] to-gray-600 text-[var(--foreground)]"
		  }`}
		>
		  {content}
		</div>
	  </div>
	);
  }