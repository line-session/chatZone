"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [studentClass, setStudentClass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    
    try {
      const response = await fetch("http://127.0.0.1:8000/api/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          username,
          email,
          password,
          role,
          student_class: role === "student" ? studentClass : null,
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        localStorage.setItem("jwt", data.access_token);
        localStorage.setItem("role", data.role);
        router.push(data.role === "student" ? "/student/" : "/teacher/");
      } else {
        setError(data.error || "Échec de l'inscription");
      }
    } catch (error) {
      setLoading(false);
      setError("Erreur réseau. Réessayez.");
    }
  };

  return (
    <div className="bg-gradient-to-br from-green-500 to-blue-600 min-h-screen flex flex-col">
      <Navbar />

      <div className="flex flex-1 items-center justify-center">
        <div className="bg-white/30 backdrop-blur-lg shadow-lg rounded-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-white mb-6">Créer un compte</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex space-x-4">
              <div className="w-1/2">
                <input
                  type="text"
                  placeholder="Prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/60 text-gray-800 border-none rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-500"
                  required
                />
              </div>
              <div className="w-1/2">
                <input
                  type="text"
                  placeholder="Nom"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/60 text-gray-800 border-none rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-500"
                  required
                />
              </div>
            </div>

            <input
              type="text"
              placeholder="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white/60 text-gray-800 border-none rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-500"
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/60 text-gray-800 border-none rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-500"
              required
            />

            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/60 text-gray-800 border-none rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-500"
              required
            />

            <div className="flex justify-center space-x-4">

              <label className="flex items-center text-white">
                <input
                  type="radio"
                  value="student"
                  checked={role === "student"}
                  onChange={() => setRole("student")}
                  className="mr-2"
                />
                Étudiant
              </label>
            </div>

            {role === "student" && (
              <input
                type="text"
                placeholder="Classe"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 text-gray-800 border-none rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-500"
              />
            )}

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-3 rounded-lg shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>S'inscrire</span>}
            </button>

            <p className="text-white text-sm mt-4">
              Vous avez déjà un compte?{" "}
              <a href="/student/login" className="text-blue-200 hover:text-white">
                Connectez-vous
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
