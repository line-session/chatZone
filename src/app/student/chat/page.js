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
  RefreshCw
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  const [currentUser, setCurrentUser] = useState("");
  const [refreshingChatrooms, setRefreshingChatrooms] = useState(false);

  // Get the selected chatroom object
  const selectedChatroom = chatrooms.find(room => room.id === selectedChatroomId);

  useEffect(() => {
    fetchChatrooms();
    setCurrentUser(localStorage.getItem("user_email") || "");
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
        const newMessage = {
          id: data.id || `temp-${Date.now()}`,
          sender: data.sender,
          message: data.message,
          created_at: data.date || new Date().toISOString()
        };
        
        // Check if message already exists to prevent duplicates
        setMessages(prev => {
          const exists = prev.some(m => 
            m.id === newMessage.id || 
            (m.message === newMessage.message && m.sender === newMessage.sender)
          );
          return exists ? prev : [...prev, newMessage];
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
      setRefreshingChatrooms(true);
      
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
      
      // Don't auto-select a chatroom
    } catch (error) {
      toast.error("Failed to load chat rooms");
      console.error(error);
    } finally {
      setIsInitialLoading(false);
      setRefreshingChatrooms(false);
    }
  };

  const refreshChatrooms = async () => {
    try {
      setRefreshingChatrooms(true);
      await fetchChatrooms();
      toast.success("Chat rooms refreshed");
    } catch (error) {
      toast.error("Failed to refresh chat rooms");
    } finally {
      setRefreshingChatrooms(false);
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
      
      // Transform and standardize message format
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

  const sendMessage = async (e) => {
    // Allow sending with Enter key or button click
    if (e && e.type === "keydown" && e.key !== "Enter") {
      return;
    }
    
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
        .filter(p => p !== currentUser)
        .join(", ");
    }
    
    return `Chat Room ${chatroom.id.substring(0, 8)}`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Function to get initials for avatar
  const getInitials = (email) => {
    if (!email) return "?";
    const parts = email.split('@');
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (Chat rooms list) - Fixed width */}
        <div className="w-64 flex-shrink-0 flex flex-col bg-blue-600 text-white border-r border-blue-700">
          {/* Sidebar header */}
          <div className="p-4 border-b border-blue-700 flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm"
              className="text-white border-white hover:bg-blue-700 w-full"
              onClick={() => setShowNewRoomForm(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create New Chatroom
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white ml-1 hover:bg-blue-700"
              onClick={refreshChatrooms}
              disabled={refreshingChatrooms}
            >
              <RefreshCw className={`h-4 w-4 ${refreshingChatrooms ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* Chat rooms container */}
          <div className="flex-1 overflow-y-auto p-2">
            {isInitialLoading ? (
              // Loading skeletons
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center space-x-2 p-3 mb-2 rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full bg-blue-300" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-blue-300" />
                  </div>
                </div>
              ))
            ) : chatrooms.length === 0 ? (
              <div className="text-center py-10 text-blue-100">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No chat rooms yet</p>
                <p className="text-xs mt-1">Create your first chat room</p>
              </div>
            ) : (
              // Chat room list
              chatrooms.map((room) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex items-center p-3 rounded-lg mb-1 cursor-pointer hover:bg-blue-700 transition",
                    selectedChatroomId === room.id ? "bg-blue-800" : ""
                  )}
                  onClick={() => handleSelectChatroom(room.id)}
                >
                  <div className="h-10 w-10 rounded-full bg-white text-blue-600 flex items-center justify-center mr-3 flex-shrink-0">
                    {room.room_name ? room.room_name.substring(0, 2).toUpperCase() : 'CR'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{getChatroomTitle(room)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 text-white hover:text-red-300 hover:bg-blue-700"
                    onClick={(e) => deleteChatroom(room.id, e)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col h-full">
          {selectedChatroom ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center">
                  <h2 className="font-semibold text-lg">{getChatroomTitle(selectedChatroom)}</h2>
                </div>
              </div>

              {/* Messages container */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoading && messages.length === 0 ? (
                  // Loading skeletons for messages
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className={`flex items-start mb-4 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full mr-2" />}
                      <div>
                        <Skeleton className="h-3 w-24 mb-1" />
                        <Skeleton className="h-16 w-64 rounded-lg" />
                      </div>
                      {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full ml-2" />}
                    </div>
                  ))
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  // Messages
                  messages.map((msg, index) => {
                    const isCurrentUser = msg.sender === currentUser;
                    return (
                      <motion.div
                        key={msg.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "mb-4 flex",
                          isCurrentUser ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isCurrentUser && (
                          <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center mr-2 mt-1">
                            {getInitials(msg.sender.email)}
                          </div>
                        )}
                        <div className="max-w-md">
                          <div className="text-xs text-gray-500 mb-1">
                            {!isCurrentUser && (
                              <span className="font-medium mr-2">
                                {msg.sender?.username?.split('@')[0] || "User"}
                              </span>
                            )}
                            <span>{formatTime(msg.created_at)}</span>
                          </div>
                          <div className={cn(
                            "rounded-lg p-3",
                            isCurrentUser 
                              ? "bg-blue-600 text-white" 
                              : "bg-gray-100 dark:bg-gray-800"
                          )}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                            >
                              {msg.message}
                            </ReactMarkdown>
                          </div>
                        </div>
                        {isCurrentUser && (
                          <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center ml-2 mt-1">
                            {getInitials(currentUser)}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Message input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex space-x-2">
                  <Input
                    ref={inputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage(e)}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !message.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <MessageSquare className="h-16 w-16 text-blue-300 mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Chat Room Selected</h2>
              <p className="text-gray-500 max-w-md mb-6">
                Select an existing chat room or create a new one to start messaging
              </p>
              <Button 
                onClick={() => setShowNewRoomForm(true)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Create New Chat Room
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Room Modal */}
      {showNewRoomForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full p-6"
          >
            <h2 className="text-xl font-bold mb-4">Create New Chat Room</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Room Name
                </label>
                <Input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g., Team Discussion"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Participants (comma-separated emails)
                </label>
                <Input
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  placeholder="e.g., user1@example.com, user2@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter email addresses of participants you want to invite
                </p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowNewRoomForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createNewChatroom}
                  disabled={isLoading || !roomName.trim() || !participants.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PlusCircle className="h-4 w-4 mr-2" />
                  )}
                  Create Room
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}