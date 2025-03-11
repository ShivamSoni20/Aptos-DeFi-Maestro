import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6">Aptos DeFi Maestro</h1>
        <ChatWindow endpoint="/api/hello" />
      </div>
    </div>
  );
}