import api from "@/lib/api";
import { useState } from "react";

export function useChatbot() {
  const [loading, setLoading] = useState(false);

  const askChatbot = async (message: string): Promise<string> => {
    setLoading(true);
    try {
      // Path: /api/v1/chatbot
      // Frontend will send: /api/proxy/api/v1/chatbot
      // Proxy will forward to backend: /api/v1/chatbot
      const res = await api.post("/api/v1/chatbot", { message });
      return (
        res.data.answer ||
        res.data.response ||
        "Maaf, tidak ada response dari chatbot."
      );
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return `Demo: Endpoint belum tersedia di backend. Tanyakan Anda: "${message}"`;
      }
      console.error("Chatbot error:", error?.response?.data || error?.message);
      return "Maaf, terjadi kesalahan. Coba lagi nanti.";
    } finally {
      setLoading(false);
    }
  };

  return { askChatbot, loading };
}
