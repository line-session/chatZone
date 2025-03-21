"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Menu } from "lucide-react";

export default function Navbar() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [jwt, setJwt] = useState(null);
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    const userRole = localStorage.getItem("role");
  
    if (!token) return; // Ne rien faire si non connecté
  
    // Vérifier si l'URL actuelle correspond au rôle de l'utilisateur
    if (window.location.pathname.startsWith("/student") && userRole !== "student") {
      router.push(`/${userRole}`);
    }
    if (window.location.pathname.startsWith("/teacher") && userRole !== "teacher") {
      router.push(`/${userRole}`);
    }
  }, []);
  

  useEffect(() => {
    // Get JWT and Role from localStorage on mount
    const token = localStorage.getItem("jwt");
    const userRole = localStorage.getItem("role");
    setJwt(token);
    setRole(userRole);
  }, []);

  const handleLogout = () => {
    const userRole = localStorage.getItem("role"); // Fetch before clearing storage
    localStorage.removeItem("jwt");
    localStorage.removeItem("role");
    setJwt(null);
    setRole(null);
    router.push(`/${userRole}/login/`);
  };

  return (
    <header className="bg-white shadow-md py-5 px-8 flex justify-between items-center border-b">
      <div className="flex items-center space-x-6">
        {/* Mobile menu toggle */}
        <button onClick={() => setIsNavOpen(!isNavOpen)} className="md:hidden">
          {isNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        
        {/* Brand name */}
        <h1 
  className={`text-2xl font-extrabold tracking-wide ${
    jwt ? "text-gray-900 cursor-default" : "text-blue-600 cursor-pointer"
  }`}
  onClick={() => {
    if (!jwt) router.push("/");
  }}
>
  Grasp<span className="text-gray-900">Eval</span>
</h1>
      </div>

      {/* Desktop Navigation */}
      {jwt && role ? (
        <nav className="hidden md:flex space-x-8">
          <a href={`/${role}`} className="text-gray-700 hover:text-black text-lg font-medium">
            Dashboard
          </a>
          <a href={`/${role}/examen/`} className="text-gray-700 hover:text-black text-lg font-medium">
            Examen
          </a>
          <a href={`/${role}/chat/`} className="text-gray-700 hover:text-black text-lg font-medium">
            Chat
          </a>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-800 text-lg font-medium"
          >
            Logout
          </button>
        </nav>
      ) : (
        <nav className="hidden md:flex space-x-8">
          <a href="/login" className="text-gray-700 hover:text-black text-lg font-medium">
            
          </a>
        </nav>
      )}

      {/* Mobile Menu */}
      {isNavOpen && jwt && role && (
        <nav className="absolute top-16 left-0 w-full bg-white shadow-md p-5 flex flex-col space-y-4 md:hidden">
          <a href={`/${role}`} className="text-gray-700 hover:text-black text-lg font-medium">
            Dashboard
          </a>
          <a href={`/${role}/examen/`} className="text-gray-700 hover:text-black text-lg font-medium">
            Examen
          </a>
          <a href={`/${role}/chat/`} className="text-gray-700 hover:text-black text-lg font-medium">
            Chat
          </a>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-800 text-lg font-medium"
          >
            Logout
          </button>
        </nav>
      )}
    </header>
  );
}
