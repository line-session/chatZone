"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  PlusCircle, 
  Trash, 
  Send,
  MessageSquare,
  Menu,
  X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [discussions, setDiscussions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chatEndRef = useRef(null);
  const router = useRouter();
  const inputRef = useRef(null);

  // Get the selected discussion object
  const selectedDiscussion = discussions.find(d => d.id === selectedDiscussionId);

  useEffect(() => {
    fetchDiscussions();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [selectedDiscussion?.messages]);

  // Focus input field when discussion changes
  useEffect(() => {
    if (selectedDiscussionId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedDiscussionId]);

  // Close sidebar on mobile when a discussion is selected
  useEffect(() => {
    if (selectedDiscussionId && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [selectedDiscussionId]);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      setTimeout(() => {
        chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  };

  const fetchDiscussions = async () => {
    try {
      setIsInitialLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/discussion/`, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to load discussions");
      }
      
      const data = await response.json();
      
      // Sort discussions by creation date (newest first)
      const sortedDiscussions = data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      setDiscussions(sortedDiscussions);
      
      // Select the first discussion by default if none is selected
      if (sortedDiscussions.length > 0 && !selectedDiscussionId) {
        setSelectedDiscussionId(sortedDiscussions[0].id);
      }
    } catch (error) {
      toast.error("Failed to load discussions");
      console.error(error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleSelectDiscussion = (id) => {
    setSelectedDiscussionId(id);
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const sendMessage = async () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage) {
      toast.error("Please enter a message");
      return;
    }
    
    if (!selectedDiscussionId) {
      toast.error("Please select or create a discussion first");
      return;
    }
    
    setIsLoading(true);
    
    // Optimistically update the UI
    const tempMessageId = `temp-${Date.now()}`;
    const userMessage = {
      id: tempMessageId,
      question: trimmedMessage,
      message: "",
      created_at: new Date().toISOString(),
      isOptimistic: true
    };
    
    setDiscussions(prev => 
      prev.map(discussion => 
        discussion.id === selectedDiscussionId 
          ? { 
              ...discussion, 
              messages: [...discussion.messages, userMessage]
            }
          : discussion
      )
    );
    
    setMessage("");
    scrollToBottom();
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        },
        body: JSON.stringify({ 
          chat: trimmedMessage, 
          discussion_id: selectedDiscussionId 
        })
      });

      if (!response.ok) {
        throw new Error("Server is not responding. Please try again later.");
      }

      const data = await response.json();
      
      // Update with real data, replacing the optimistic entry
      setDiscussions(prev => 
        prev.map(discussion => 
          discussion.id === selectedDiscussionId 
            ? { 
                ...discussion, 
                messages: discussion.messages.map(msg => 
                  msg.id === tempMessageId
                    ? { 
                        id: data.id || tempMessageId,
                        question: trimmedMessage,
                        message: data.message,
                        created_at: data.created_at || new Date().toISOString(),
                        isOptimistic: false
                      }
                    : msg
                )
              }
            : discussion
        )
      );
    } catch (error) {
      toast.error(error.message);
      
      // Remove optimistic update on error
      setDiscussions(prev => 
        prev.map(discussion => 
          discussion.id === selectedDiscussionId 
            ? { 
                ...discussion, 
                messages: discussion.messages.filter(msg => msg.id !== tempMessageId)
              }
            : discussion
        )
      );
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const createNewDiscussion = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/discussion/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        }
      });
  
      if (!response.ok) {
        throw new Error("Failed to create a Nouvelle discussion");
      }
      
      const data = await response.json();
      
      // Instead of manually adding the discussion, refetch all discussions
      await fetchDiscussions();
      
      // Select the Nouvelle discussion
      setSelectedDiscussionId(data.uuid);
      
      toast.success("Nouvelle discussion created");
      
      // Focus the input field
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDiscussion = async (id, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!id) return;
    
    if (!confirm("Are you sure you want to delete this discussion?")) {
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/discussion/${id}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete the discussion");
      }
      
      // Remove from state
      setDiscussions(prev => prev.filter(d => d.id !== id));
      
      // If the deleted discussion was selected, select another one
      if (selectedDiscussionId === id) {
        const nextDiscussion = discussions.find(d => d.id !== id);
        setSelectedDiscussionId(nextDiscussion?.id || null);
      }
      
      toast.success("Discussion deleted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getDiscussionTitle = (discussion) => {
    const firstMessage = discussion.messages[0]?.question;
    if (firstMessage) {
      return firstMessage.length > 30 
        ? `${firstMessage.substring(0, 30)}...` 
        : firstMessage;
    }
    return "Nouvelle Discussion";
  };

  // Custom components for ReactMarkdown
  const MarkdownComponents = {
    p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
    a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
    code: ({ node, inline, ...props }) => 
      inline 
        ? <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-sm" {...props} />
        : <pre className="p-4 rounded bg-zinc-100 dark:bg-zinc-700 overflow-x-auto my-4"><code {...props} /></pre>,
    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3 mt-5" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-3 mt-4" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4" {...props} />,
    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic my-4" {...props} />
  };

  // Render skeletons while loading
  const renderSkeletons = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <div key={`skeleton-${index}`} className="p-2">
        <Skeleton className="h-12 w-full rounded" />
      </div>
    ));
  };

  // Render discussions list
  const renderDiscussions = () => {
    if (discussions.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            No discussions yet
          </p>
          <Button 
            variant="link" 
            onClick={createNewDiscussion}
            className="mt-2 text-blue-600 dark:text-blue-400"
          >
            Create your first discussion
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {discussions.map((discussion) => (
          <motion.div
            key={discussion.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              onClick={() => handleSelectDiscussion(discussion.id)}
              className={cn(
                "flex items-center justify-between p-2 rounded-md cursor-pointer group",
                selectedDiscussionId === discussion.id
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full",
                  selectedDiscussionId === discussion.id
                    ? "bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                )}>
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">
                    {getDiscussionTitle(discussion)}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(discussion.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => deleteDiscussion(discussion.id, e)}
                className="opacity-0 group-hover:opacity-100 h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // Render empty state when no discussion is selected
  const renderEmptyState = () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center p-4 md:p-8 max-w-md">
        <h3 className="text-xl font-semibold mb-2">
          No discussion selected
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
          Select an existing discussion or create a new one to start chatting.
        </p>
        <Button 
          onClick={createNewDiscussion} 
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Create New Discussion
        </Button>
      </div>
    </div>
  );

  // Render welcome message when discussion has no messages
  const renderWelcomeMessage = () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center p-4 md:p-8 max-w-md mx-auto">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full inline-flex mb-4">
          <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          Start a new conversation
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
          Type a message below to begin chatting with the AI assistant.
        </p>
      </div>
    </div>
  );

  // Render messages in a discussion
  const renderMessages = () => {
    if (!selectedDiscussion || selectedDiscussion.messages.length === 0) {
      return renderWelcomeMessage();
    }

    const sortedMessages = [...selectedDiscussion.messages].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    return (
      <div className="space-y-4">
        {sortedMessages.map((msg) => (
          <div key={`${msg.discussion}-${msg.created_at}`} className="space-y-3">
            {/* User message */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3"
            >
              <Avatar className="h-8 w-8 bg-blue-600 text-white">
                <span className="text-xs"></span>
              </Avatar>
              <div className="bg-white dark:bg-zinc-800 py-2 px-3 md:px-4 rounded-lg shadow-sm flex-1 break-words">
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={MarkdownComponents}
                  >
                    {msg.question}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
            
            {/* AI response */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex items-start gap-3"
            >
              <Avatar className="h-8 w-8 bg-purple-600 text-white">
                <span className="text-xs"></span>
              </Avatar>
              <div className="bg-white dark:bg-zinc-800 py-2 px-3 md:px-4 rounded-lg shadow-sm flex-1 break-words">
                {msg.isOptimistic ? (
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Reflexion en cours...</span>
                  </div>
                ) : (
                  <div className="prose dark:prose-invert prose-sm max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={MarkdownComponents}
                    >
                      {msg.message}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
      <Navbar />

      <div className="flex flex-grow overflow-hidden relative">
        {/* Mobile sidebar toggle button */}
        <div className="md:hidden fixed bottom-4 left-4 z-20">
          <Button
            onClick={toggleSidebar}
            className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Sidebar */}
        <aside 
          className={cn(
            "absolute md:relative z-10 w-full md:w-80 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto transition-all duration-300 ease-in-out", 
            sidebarOpen 
              ? "left-0" 
              : "-left-full md:left-0",
            "h-full"
          )}
        >
          <div className="p-4">
            <Button
              onClick={createNewDiscussion}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>Nouvelle Discussion</span>
                </>
              )}
            </Button>
          </div>
          
          <div className="px-3 pb-20 md:pb-2">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 px-2 mb-2">
              Discussions
            </h2>
            
            {isInitialLoading ? renderSkeletons() : renderDiscussions()}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-900">
          {selectedDiscussion ? (
            <>
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-2 md:p-4">
                {renderMessages()}
              </div>
              
              {/* Input area */}
              <div className="p-2 md:p-4 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !isLoading && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-grow py-5 md:py-6 text-base"
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={isLoading || !message.trim()} 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : renderEmptyState()}
        </main>
      </div>
    </div>
  );
}