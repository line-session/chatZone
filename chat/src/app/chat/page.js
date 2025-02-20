"use client";

import { useState } from "react";
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

  const sendMessage = async () => {
    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }

    setLoading(true);
    setError("");  // Reset previous errors
    setResponse("");

    try {
      const res = await fetch("http://18.116.49.13:8000/api/generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat: message }),
      });

      if (!res.ok) {
        setError("Server is not active, please try again later.");
        setLoading(false);
        setMessage(""); // Reset the input field after an error
        setTimeout(() => {
          setError(""); // Reset error after 3 seconds
        }, 3000); // You can change this duration to suit your preference
        return;
      }

      const data = await res.json();

      if (data.message) {
        const newChat = { user: message, bot: data.message || "No response" };
        setChatHistory([...chatHistory, newChat]);
      } else {
        setError("No response from the server.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
      setLoading(false);
      setMessage(""); 
      setTimeout(() => {
        setError("");
      }, 3000); 
    }

    setLoading(false);
    setMessage(""); 
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-gradient-to-r from-gray-100 to-gray-300 p-4 sm:p-8">
      {/* Navbar */}
      <div className="w-full bg-gray-800 text-white py-4 px-8 flex items-center justify-between shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-extrabold">SGBD</h1>
        <div className="space-x-4">
          <Link href="/Devoir">
            <Button className="text-sm sm:text-lg bg-gray-600 text-white py-2 px-4 hover:bg-gray-700">
              Devoir
            </Button>
          </Link>
          <Link href="/IA">
            <Button className="text-sm sm:text-lg bg-gray-600 text-white py-2 px-4 hover:bg-gray-700">
              IA
            </Button>
          </Link>
          <Link href="/Logout">
            <Button className="text-sm sm:text-lg bg-blue-400 text-white py-2 px-4 hover:bg-blue-300">
              Logout
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content: Chatbox Zone */}
      <div className="flex flex-col w-full mt-6 flex-grow bg-gray-50 p-4 sm:p-6 space-y-6">
        {/* Output Messages */}
        <div className="flex flex-col space-y-4 flex-grow overflow-y-auto p-4 bg-gray-100 shadow-inner min-h-[200px]">
          {chatHistory.length === 0 ? (
            <div className="text-xl sm:text-2xl text-center text-gray-500 italic py-10">
              Start the conversation
            </div>
          ) : (
            chatHistory.map((chat, index) => (
              <div key={index} className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gradient-to-r from-gray-600 to-gray-500 text-white p-3 w-fit self-end shadow-lg"
                >
                  {chat.user}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-100 text-gray-700 p-3 w-fit shadow-lg"
                >
                  {chat.bot}
                </motion.div>
              </div>
            ))
          )}
        </div>

        {/* Input Field and Send Button */}
        <div className="flex flex-col sm:flex-row items-center sm:space-x-4 mt-4 pt-4 border-t-2 border-gray-300">
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask something..."
            className="w-full sm:w-auto flex-grow py-3 px-5 text-lg border border-gray-300 bg-gray-100 text-gray-800"
          />
          <Button
            onClick={sendMessage}
            disabled={loading}
            className="w-full sm:w-auto mt-4 sm:mt-0 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-lg py-3 px-8 shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Send"}
          </Button>
        </div>

        {/* Error Message */}
        {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
      </div>
    </div>
  );
}
