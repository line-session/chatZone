"use client";
import Navbar from "@/components/ui/Navbar";
import { useRouter } from "next/navigation";
import { User, GraduationCap } from "lucide-react";


export default function Home() {
  const router = useRouter();

  return (
    <div>
    <div>
      <Navbar/>
    </div>
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 p-6">
      <div className="bg-white shadow-xl rounded-2xl p-10 max-w-md text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Welcome to GraspEval</h1>
        <p className="text-lg text-gray-700 mb-6">Are you a teacher or a student?</p>
        
        <div className="flex flex-col space-y-4">
          <button
            onClick={() => router.push("/teacher/login/")}
            className="flex items-center justify-center space-x-3 px-6 py-4 bg-blue-600 text-white font-semibold text-lg rounded-lg shadow-md hover:bg-blue-700 transition duration-300 transform hover:scale-105"
          >
            <GraduationCap className="w-6 h-6" />
            <span>I'm a Teacher</span>
          </button>

          <button
            onClick={() => router.push("/student/login/")}
            className="flex items-center justify-center space-x-3 px-6 py-4 bg-green-600 text-white font-semibold text-lg rounded-lg shadow-md hover:bg-green-700 transition duration-300 transform hover:scale-105"
          >
            <User className="w-6 h-6" />
            <span>I'm a Student</span>
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

