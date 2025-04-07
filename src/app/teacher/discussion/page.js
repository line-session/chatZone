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
  Users
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

export default function ChatRoom() {
  const [message, setMessage] = useState("");
  const [chatrooms, setChatrooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedChatroomId, setSelectedChatroomId] = useState(null);
  const [participants, setParticipants] = useState("");
  const [wsConnection, setWsConnection] = useState(null);
  const [showNewRoomForm, setShowNewRoomForm] = useState(false);
  const chatEndRef = useRef(null);
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const inputRef = useRef(null);

  // Get the selected chatroom object
  const selectedChatroom = chatrooms.find(room => room.id === selectedChatroomId);

  useEffect(() => {
    fetchChatrooms();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input field when chatroom changes
  useEffect(() => {
    if (selectedChatroomId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedChatroomId]);

  // Handle WebSocket connection
  useEffect(() => {
    if (selectedChatroomId) {
      connectWebSocket(selectedChatroomId);
      fetchMessages(selectedChatroomId);
    }

    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [selectedChatroomId]);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      setTimeout(() => {
        if (messages.length > 0) {
          chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }, 100);
    }
  };

  const connectWebSocket = (chatroomId) => {
    if (wsConnection) {
      wsConnection.close();
    }

    const jwt = localStorage.getItem("jwt");
    const ws = new WebSocket(`ws://${API_BASE_URL.replace('http://', '')}/ws/chat/${chatroomId}/?token=${jwt}`);
    
    ws.onopen = () => {
      console.log("WebSocket connected");
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Transform the message to match our expected format
        if (data.message) {
          const transformedMessage = {
            sender: data.sender,
            message: data.message,
            created_at: data.timestamp || new Date().toISOString() // Fall back to current time if no timestamp
          };
          
          // Add the new message to the chat
          setMessages(prev => {
            const exists = prev.some(m => 
              m.message === transformedMessage.message && 
              m.sender === transformedMessage.sender
            );
            return exists ? prev : [...prev, transformedMessage];
          });
          scrollToBottom();
        }
      };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast.error("Connection error. Please try again.");
    };
    
    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };
    
    setWsConnection(ws);
  };

  const fetchChatrooms = async () => {
    try {
      setIsInitialLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/chatroom/list/`, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to load chat rooms");
      }
      
      const data = await response.json();
      
      // Sort chatrooms by creation date (newest first)
      const sortedChatrooms = data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      setChatrooms(sortedChatrooms);
      
      // Select the first chatroom by default if none is selected
      if (sortedChatrooms.length > 0 && !selectedChatroomId) {
        setSelectedChatroomId(sortedChatrooms[0].id);
      }
    } catch (error) {
      toast.error("Failed to load chat rooms");
      console.error(error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const fetchMessages = async (chatroomId) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/chatroom/${chatroomId}/messages/`, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to load messages");
      }
      
      const data = await response.json();
      
      // Transform messages to match our component's expected format
      const transformedMessages = data.messages.map(msg => ({
        id: msg.id,
        sender: msg.sender,
        message: msg.content,
        created_at: msg.timestamp
      }));
      
      // Sort messages by creation date (oldest first)
      const sortedMessages = transformedMessages.sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );
      
      setMessages(sortedMessages);
      scrollToBottom();
    } catch (error) {
      toast.error("Failed to load messages");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChatroom = (id) => {
    setSelectedChatroomId(id);
  };

  const sendMessage = async () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage) {
      toast.error("Please enter a message");
      return;
    }
    
    if (!selectedChatroomId) {
      toast.error("Please select or create a chat room first");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Send message through WebSocket
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
          message: trimmedMessage, 
          type: "chat_message"
        }));
        
        // Clear the input field
        setMessage("");
      } else {
        throw new Error("WebSocket not connected. Please try again.");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChatroom = async () => {
    if (!roomName.trim()) {
      toast.error("Please enter a room name");
      return;
    }
    
    if (!participants.trim()) {
      toast.error("Please enter at least one participant email");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Convert comma-separated emails to array
      const participantsList = participants.split(",").map(email => email.trim());
      
      const response = await fetch(`${API_BASE_URL}/api/chatroom/create/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        },
        body: JSON.stringify({
          participants: participantsList,
          room_name: roomName.trim()
        })
      });
  
      if (!response.ok) {
        throw new Error("Failed to create a new chat room");
      }
      
      const data = await response.json();
      
      // Refetch all chatrooms
      await fetchChatrooms();
      
      // Select the new chatroom
      setSelectedChatroomId(data.id);
      
      // Reset form
      setParticipants("");
      setRoomName("");
      setShowNewRoomForm(false);
      
      toast.success("New chat room created");
      
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

  const deleteChatroom = async (id, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!id) return;
    
    if (!confirm("Are you sure you want to delete this chat room?")) {
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/chatroom/${id}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete the chat room");
      }
      
      // Remove from state
      setChatrooms(prev => prev.filter(room => room.id !== id));
      
      // If the deleted chatroom was selected, select another one
      if (selectedChatroomId === id) {
        const nextChatroom = chatrooms.find(room => room.id !== id);
        setSelectedChatroomId(nextChatroom?.id || null);
      }
      
      toast.success("Chat room deleted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getChatroomTitle = (chatroom) => {
    if (chatroom.room_name) {
      return chatroom.room_name;
    }
    
    if (chatroom.participants && chatroom.participants.length > 0) {
      // Extract just the usernames or emails
      return chatroom.participants
        .map(p => p.username || p.email)
        .filter(p => p !== localStorage.getItem("user_email"))
        .join(", ");
    }
    
    return `Chat Room ${chatroom.id.substring(0, 8)}`;
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

  // Render chatrooms list
  const renderChatrooms = () => {
    if (chatrooms.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            No chat rooms yet
          </p>
          <Button 
            variant="link" 
            onClick={() => setShowNewRoomForm(true)}
            className="mt-2 text-blue-600 dark:text-blue-400"
          >
            Create your first chat room
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {chatrooms.map((chatroom) => (
          <motion.div
            key={chatroom.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              onClick={() => handleSelectChatroom(chatroom.id)}
              className={cn(
                "flex items-center justify-between p-2 rounded-md cursor-pointer group",
                selectedChatroomId === chatroom.id
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full",
                  selectedChatroomId === chatroom.id
                    ? "bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                )}>
                  <Users className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">
                    {getChatroomTitle(chatroom)}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(chatroom.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => deleteChatroom(chatroom.id, e)}
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

  // Render new chatroom form
  const renderNewChatroomForm = () => (
    <div className="p-4 space-y-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
      <h3 className="font-medium">Create New Chat Room</h3>
      <div>
        <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">
          Room Name <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Enter room name"
          className="text-sm"
          required
        />
      </div>
      <div>
        <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">
          Participants (comma-separated emails) <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          value={participants}
          onChange={(e) => setParticipants(e.target.value)}
          placeholder="user1@example.com, user2@example.com"
          className="text-sm"
          required
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewRoomForm(false)}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={createNewChatroom}
          disabled={isLoading || !participants.trim() || !roomName.trim()}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Create"
          )}
        </Button>
      </div>
    </div>
  );

  // Render empty state when no chatroom is selected
  const renderEmptyState = () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <h3 className="text-xl font-semibold mb-2">
          No chat room selected
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
          Select an existing chat room or create a new one to start chatting.
        </p>
        <Button 
          onClick={() => setShowNewRoomForm(true)} 
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Create New Chat Room
        </Button>
      </div>
    </div>
  );

  // Render welcome message when chatroom has no messages
  const renderWelcomeMessage = () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center p-8 max-w-md mx-auto">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full inline-flex mb-4">
          <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          Start a new conversation
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
          Type a message below to begin chatting.
        </p>
      </div>
    </div>
  );

  // Render messages in a chatroom
  const renderMessages = () => {
    if (!messages || messages.length === 0) {
      return renderWelcomeMessage();
    }

    const currentUser = localStorage.getItem("user_email") || "";

    return (
      <div className="space-y-4">
        {messages.map((msg) => {
          const isCurrentUser = msg.sender?.email === currentUser;
          
          return (
            <motion.div 
              key={msg.id || `msg-${msg.created_at}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-start gap-3 ${isCurrentUser ? 'justify-end' : ''}`}
            >
              {!isCurrentUser && (
                <Avatar className="h-8 w-8 bg-purple-600 text-white">
                  <span className="text-xs">{msg.sender?.username?.charAt(0).toUpperCase()}</span>
                </Avatar>
              )}
              
              <div className={cn(
                "py-2 px-4 rounded-lg shadow-sm max-w-[70%]",
                isCurrentUser 
                  ? "bg-blue-600 text-white" 
                  : "bg-white dark:bg-zinc-800"
              )}>
                {!isCurrentUser && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                    {msg.sender.username}
                  </p>
                )}
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={MarkdownComponents}
                  >
                    {msg.message}
                  </ReactMarkdown>
                </div>
                <p className="text-xs text-right mt-1 opacity-70">
                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              
              {isCurrentUser && (
                <Avatar className="h-8 w-8 bg-blue-600 text-white">
                  <span className="text-xs">{currentUser.charAt(0).toUpperCase()}</span>
                </Avatar>
              )}
            </motion.div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
      <Navbar />

      <div className="flex flex-grow overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto transition-all">
          <div className="p-4">
            <Button
              onClick={() => setShowNewRoomForm(!showNewRoomForm)}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>New Chat Room</span>
                </>
              )}
            </Button>
          </div>
          
          {showNewRoomForm && (
            <div className="px-4 mb-4">
              {renderNewChatroomForm()}
            </div>
          )}
          
          <div className="px-3 pb-2">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 px-2 mb-2">
              Chat Rooms
            </h2>
            
            {isInitialLoading ? renderSkeletons() : renderChatrooms()}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-900">
          {selectedChatroom ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">{getChatroomTitle(selectedChatroom)}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {selectedChatroom.participants?.length || 0} participants
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4">
                {renderMessages()}
              </div>
              
              {/* Input area */}
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !isLoading && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-grow py-6 text-base"
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