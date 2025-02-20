"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link"; 

export default function Chat() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);

  const sendMessage = async () => {
    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }

    setLoading(true);
    setError("");  
    setResponse("");

    try {
      const res = await fetch("https://a0h7h8xck0.execute-api.us-east-2.amazonaws.com/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat: message }),
      });

      if (!res.ok) {
        setError("Server is not active, please try again later.");
        setLoading(false);
        setMessage("");
        setTimeout(() => setError(""), 3000);
        return;
      }

      const data = await res.json();

      if (data.message) {
        setChatHistory([...chatHistory, { user: message, bot: data.message || "No response" }]);
      } else {
        setError("No response from the server.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
      setLoading(false);
      setMessage("");
      setTimeout(() => setError(""), 3000);
    }

    setLoading(false);
    setMessage("");
  };

  // Auto-scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-r from-gray-100 to-gray-300">
      {/* Navbar */}
      <div className="w-full bg-gray-800 text-white py-4 px-8 flex items-center justify-between shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-extrabold">SGBD</h1>
        <div className="space-x-4">
          <Link href="#"><Button className="text-sm sm:text-lg bg-gray-600 text-white py-2 px-4 hover:bg-gray-700 italic">Devoir</Button></Link>
          <Link href="#"><Button className="text-sm sm:text-lg bg-gray-600 text-white py-2 px-4 hover:bg-gray-700 italic">IA</Button></Link>
          <Link href="#"><Button className="text-sm sm:text-lg bg-blue-400 text-white py-2 px-4 hover:bg-blue-300 italic">Logout</Button></Link>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex flex-col flex-grow overflow-y-auto p-4 bg-gray-50 shadow-inner space-y-4">
        {chatHistory.length === 0 ? (
          <div className="text-xl sm:text-2xl text-center text-gray-500 italic py-10">Start the conversation</div>
        ) : (
          chatHistory.map((chat, index) => (
            <div key={index} className="space-y-4"> {/* Added space between messages */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-gradient-to-r from-gray-600 to-gray-500 text-white p-3 w-fit self-end shadow-lg">
                {chat.user}
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-gray-100 text-gray-700 p-3 w-fit shadow-lg">
                {chat.bot}
              </motion.div>
            </div>
          ))
        )}
        <div ref={chatEndRef}></div>
        </div>


      {/* Input & Send Button (Fixed at Bottom) */}
      <div className="flex items-center space-x-4 p-4 border-t-2 border-gray-300 bg-white">
        <Input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask something..." className="flex-grow py-3 px-5 text-lg border border-gray-300 bg-gray-100 text-gray-800" />
        <Button onClick={sendMessage} disabled={loading} className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-lg py-3 px-8 shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none">
          {loading ? <Loader2 className="animate-spin" /> : "Send"}
        </Button>
      </div>

      {/* Error Message */}
      {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
    </div>
  );
}
