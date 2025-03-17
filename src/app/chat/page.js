"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Loader2, Menu, X, PlusCircle, Trash } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const fetchChatHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/discussion/", {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        }
      });
      if (!res.ok) throw new Error("Failed to load history.");
      const data = await res.json();
      setChatHistory(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))); // Sort discussions by created_at
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectDiscussion = (uuid) => {
    setSelectedDiscussion(uuid);
  };

  const sendMessage = async () => {
    if (!message.trim()) return setError("Please enter a message.");
    if (!selectedDiscussion) return setError("Please select a discussion first.");
    
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/generate/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        },
        body: JSON.stringify({ chat: message, discussion_id: selectedDiscussion })
      });

      if (!res.ok) throw new Error("Server is not active, please try again later.");

      const data = await res.json();
      setChatHistory((prev) => prev.map((chat) =>
        chat.id === selectedDiscussion ? { ...chat, messages: [...chat.messages, { message: data.message, question: message, created_at: new Date().toISOString() }] } : chat
      ));
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
    setMessage("");
  };

  const createNewDiscussion = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/discussion/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        }
      });
      if (!res.ok) throw new Error("Failed to create a new discussion.");
      
      const data = await res.json();
      setChatHistory((prev) => [ { id: data.uuid, messages: [] }, ...prev ]); // Adding new discussion at the top
      setSelectedDiscussion(data.uuid);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const deleteDiscussion = async (uuid) => {
    if (!uuid) return;

    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/discussion/${uuid}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete the discussion.");
      
      setChatHistory((prev) => prev.filter((chat) => chat.id !== uuid));
      setSelectedDiscussion(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    setTimeout(() => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
  }, [chatHistory, selectedDiscussion]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-900">
      <header className="bg-white shadow-md py-4 px-6 flex justify-between items-center border-b">
        <div className="flex items-center space-x-4">
          <button onClick={() => setIsNavOpen(!isNavOpen)} className="md:hidden">
            {isNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h1 className="text-xl font-bold">Chat App</h1>
        </div>
      </header>

      <div className="flex flex-grow overflow-hidden">
        <aside className={`w-1/4 bg-white p-4 shadow-md overflow-y-auto ${isNavOpen ? 'block' : 'hidden'} md:block`}>
          <div className="flex items-center mb-3">
            <button 
              onClick={createNewDiscussion} 
              className="mr-3 text-green-600 flex items-center"
            >
              <PlusCircle className="justify-right 44w-6 h-6 mr-2" />
              New Discussion
            </button>
          </div>
          <h2 className="text-lg font-bold mb-3">Discussions</h2>
          <div className="space-y-2">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleSelectDiscussion(chat.id)}
                className={`p-3 rounded-lg cursor-pointer ${selectedDiscussion === chat.id ? "bg-blue-500 text-white" : "bg-gray-100"}`}
              >
                <div className="flex justify-between">
                  <span>{chat.messages[0]?.question || "Untitled Discussion"}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteDiscussion(chat.id); }} 
                    className="text-red-500"
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="flex-1 flex flex-col space-y-4">
            {selectedDiscussion ? (
              chatHistory
                .find((chat) => chat.id === selectedDiscussion)
                ?.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                .map((msg, index) => (
                  <div key={index} className="space-y-4 flex">
                    <motion.div className="bg-blue-600 text-white p-3 rounded-lg max-w-[60%] self-start">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.question}</ReactMarkdown>
                    </motion.div>
                    <motion.div className="bg-white p-3 rounded-lg shadow-md max-w-[60%] self-end ml-auto mt-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
                    </motion.div>
                  </div>
                ))
            ) : (
              <p className="text-center text-gray-500 italic">Select a discussion to view messages</p>
            )}
            <div ref={chatEndRef}></div>
          </div>
        </main>
      </div>

      <footer className="p-4 border-t bg-white shadow-md w-full flex items-center space-x-3">
        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
          placeholder="Type a message..."
          className="flex-grow p-3 border border-gray-300 rounded-lg"
        />
        <Button onClick={sendMessage} disabled={loading} className="bg-blue-600 text-white py-2 px-6 rounded-lg">
          {loading ? <Loader2 className="animate-spin" /> : "Send"}
        </Button>
      </footer>
    </div>
  );
}
