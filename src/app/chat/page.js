"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Loader2, Menu, X } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const chatEndRef = useRef

  const fetchChatHistory = async () => {
    try {
      const res = await fetch("https://fluffy-trout-xp695wxrg79fp7g7-8000.app.github.dev/api/discussion/");
      const data = await res.json();
      setChatHistory(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const sendMessage = async () => {
    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "https://a0h7h8xck0.execute-api.us-east-2.amazonaws.com/api/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat: message }),
        }
      );

      if (!res.ok) throw new Error("Server is not active, please try again later.");

      const data = await res.json();
      setChatHistory([...chatHistory, { user: message, bot: data.message || "No response" }]);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
    setMessage("");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 text-gray-900">
      {/* Navbar */}
      <header className="w-full bg-white shadow-md py-4 px-6 flex items-center justify-between border-b relative">
        <div className="flex items-center space-x-4">
          <button onClick={() => setIsNavOpen(!isNavOpen)} className="md:hidden">
            {isNavOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
          </button>
          <h1 className="text-xl font-bold text-gray-900">Chat App</h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-4">
          <Link href="/Devoir"><Button variant="ghost">Devoir</Button></Link>
          <Link href="/IA"><Button variant="ghost">IA</Button></Link>
          <Link href="/Logout"><Button className="bg-red-500 hover:bg-red-400 text-white">Logout</Button></Link>
        </nav>

        {/* Mobile Navigation */}
        {isNavOpen && (
          <nav className="absolute top-14 left-0 w-full bg-white shadow-lg flex flex-col items-center py-4 space-y-3 md:hidden">
            <Link href="/Devoir"><Button variant="ghost" onClick={() => setIsNavOpen(false)}>Devoir</Button></Link>
            <Link href="/IA"><Button variant="ghost" onClick={() => setIsNavOpen(false)}>IA</Button></Link>
            <Link href="/Logout"><Button className="bg-red-500 hover:bg-red-400 text-white" onClick={() => setIsNavOpen(false)}>Logout</Button></Link>
          </nav>
        )}
      </header>

      {/* Chat Section */}
      <div className="flex flex-grow overflow-y-auto p-6 space-y-4">
        <main className="w-full max-w-3xl mx-auto flex flex-col space-y-4">
          {chatHistory.length === 0 ? (
            <p className="text-center text-gray-500 italic">Start the conversation</p>
          ) : (
            chatHistory.map((chat, index) => (
              <div key={index} className="flex flex-col space-y-4">
                {/* User Message */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-blue-600 text-white p-3 rounded-lg w-fit self-end shadow-md text-right max-w-[80%]"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{chat.user}</ReactMarkdown>
                </motion.div>

                {/* Bot Response */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white text-gray-900 p-3 rounded-lg w-fit shadow-md text-left max-w-[80%]"
                >
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={dracula}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {chat.bot}
                  </ReactMarkdown>
                </motion.div>
              </div>
            ))
          )}
          <div ref={chatEndRef}></div>
        </main>
      </div>

      {/* Input Section */}
      <footer className="flex items-center space-x-3 p-4 border-t bg-white shadow-md w-full">
        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
          placeholder="Ask something..."
          className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring focus:ring-blue-400"
        />
        <Button onClick={sendMessage} disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-6 rounded-lg shadow-md">
          {loading ? <Loader2 className="animate-spin" /> : "Send"}
        </Button>
      </footer>

      {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
    </div>
  );
}
