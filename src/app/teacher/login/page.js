"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        localStorage.setItem("jwt", data.access_token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("user", data.username);
        router.push(data.role === "student" ? "/student" : "/teacher");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (error) {
      setLoading(false);
      setError("Network error. Please try again.");
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen flex flex-col">
      <Navbar />

      <div className="flex flex-1 items-center justify-center">
        <div className="bg-white/30 backdrop-blur-lg shadow-lg rounded-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-white mb-6">Login</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 text-gray-800 border-none rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-500"
                required
              />
            </div>

            <div className="relative">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 text-gray-800 border-none rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-500"
                required
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Login</span>}
            </button>

            <p className="text-white text-sm mt-4">
              Don't have an account?{" "}
              <a href="/teacher/register/" className="text-blue-200 hover:text-white">
                Create one
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
