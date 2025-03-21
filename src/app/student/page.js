"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/ui/Navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExams() {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/work/student/stats/", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("jwt")}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch exams");

        const data = await response.json();
        setExams(data.exams);
      } catch (error) {
        console.error("Error fetching exams:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchExams();
  }, []);

  const totalExams = exams.length;
  const bestScore = exams.length > 0 ? Math.max(...exams.map((exam) => exam.note || 0)) : "N/A";
  const avgScore =
    exams.length > 0 ? (exams.reduce((sum, exam) => sum + (exam.note || 0), 0) / exams.length).toFixed(1) : "N/A";

  // Data for Bar Chart
  const barChartData = exams.map((exam) => ({
    name: exam.title,
    score: exam.note || 0,
  }));

  // Data for Pie Chart (Pass/Fail)
  const passed = exams.filter((exam) => exam.note >= 10).length;
  const failed = totalExams - passed;
  const pieChartData = [
    { name: "Passed", value: passed },
    { name: "Failed", value: failed },
  ];
  const COLORS = ["#22c55e", "#ef4444"];

  return (
    <div>
      <Navbar />
      <main className="p-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Student Dashboard</h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Exams</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{totalExams}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Best Score</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{bestScore}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Average Score</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{avgScore}</CardContent>
          </Card>
        </div>

        {/* Charts */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Bar Chart for Scores */}
            <Card className="p-4">
              <CardHeader>
                <CardTitle className="text-lg">Exam Scores</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 20]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie Chart for Pass/Fail */}
            <Card className="p-4">
              <CardHeader>
                <CardTitle className="text-lg">Pass/Fail Ratio</CardTitle>
              </CardHeader>
              <CardContent className="h-64 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieChartData} dataKey="value" outerRadius={80} label>
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
