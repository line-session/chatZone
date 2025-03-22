"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Loader2, Trash, X, FileText, User, Clock, MessageSquare, Star, Edit, Check, Upload, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";

export default function ExamList() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [studentWorks, setStudentWorks] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const router = useRouter();
  const [editingGrade, setEditingGrade] = useState(null);
  const [gradeValue, setGradeValue] = useState("");
  const [showNewExamForm, setShowNewExamForm] = useState(false);
  const [newExam, setNewExam] = useState({
    classroom: "",
    title: "",
    description: "",
    deadline: ""
  });
  const [examFile, setExamFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  
    
  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load exams.");
      const data = await res.json();
      setExams(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchExamDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/${id}/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch exam details.");
      const data = await res.json();
      setSelectedExam(data);

      // Fetch student submissions if teacher
      if (data.student_works) {
        setStudentWorks(data.student_works);
      } else {
        setStudentWorks([]);
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingDetails(false);
  };

  const deleteExam = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/${id}/delete`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete exam.");
      setExams((prev) => prev.filter((exam) => exam.id !== id));
      setSelectedExam(null);
      setStudentWorks([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Function to handle secure downloads with JWT token
  const handleDownload = async (url, filename) => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download the file. Please try again.");
    }
    setDownloading(false);
  };

  const updateGrade = async (workId, note) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/work/${workId}/grade/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`,
        },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Failed to update grade.");
      
      // Update grade in local state
      setStudentWorks(prev => 
        prev.map(work => 
          work.id === workId ? { ...work, note } : work
        )
      );
      setEditingGrade(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update grade. Please try again.");
    }
  };

  const handleGradeEditStart = (workId, currentGrade) => {
    setEditingGrade(workId);
    setGradeValue(currentGrade || "");
  };

  const handleGradeSubmit = (workId) => {
    updateGrade(workId, gradeValue);
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setExamFile(e.target.files[0]);
    }
  };

  const createNewExam = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append("classroom", newExam.classroom);
      formData.append("title", newExam.title);
      formData.append("description", newExam.description);
      formData.append("deadline", new Date(newExam.deadline).toISOString());
      
      // Append the file if selected
      if (examFile) {
        formData.append("content", examFile);
      }
      
      const res = await fetch(`${API_BASE_URL}/api/exams/create/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`,
          // Don't set Content-Type when using FormData, the browser will set it with the boundary
        },
        body: formData,
      });
      
      if (!res.ok) throw new Error("Failed to create exam.");
      
      // Refresh exam list
      fetchExams();
      // Reset form and hide it
      setNewExam({
        classroom: "",
        title: "",
        description: "",
        deadline: ""
      });
      setExamFile(null);
      setShowNewExamForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create exam. Please try again.");
    }
    
    setSubmitting(false);
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatDateForInput = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">My Exams</h1>
          <Button 
            onClick={() => setShowNewExamForm(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center"
          >
            <PlusCircle className="w-5 h-5 mr-2" /> Create New Exam
          </Button>
        </div>

        {/* New Exam Form */}
        {showNewExamForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Create New Exam</h2>
              <button
                onClick={() => setShowNewExamForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={createNewExam} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title*
                </label>
                <Input
                  id="title"
                  value={newExam.title}
                  onChange={(e) => setNewExam({...newExam, title: e.target.value})}
                  placeholder="Enter exam title"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="classroom" className="block text-sm font-medium text-gray-700 mb-1">
                  Classroom*
                </label>
                <Input
                  id="classroom"
                  value={newExam.classroom}
                  onChange={(e) => setNewExam({...newExam, classroom: e.target.value})}
                  placeholder="Enter classroom (e.g. dic1)"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={newExam.description}
                  onChange={(e) => setNewExam({...newExam, description: e.target.value})}
                  placeholder="Enter exam description"
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Content (File)*
                </label>
                <div className="flex items-center">
                  <Input
                    id="content"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current.click()}
                    className="flex items-center"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {examFile ? 'Change File' : 'Upload File'}
                  </Button>
                  <span className="ml-3 text-sm text-gray-500">
                    {examFile ? examFile.name : 'No file selected'}
                  </span>
                </div>
              </div>
              
              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline*
                </label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={newExam.deadline}
                  onChange={(e) => setNewExam({...newExam, deadline: e.target.value})}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewExamForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={submitting || !examFile}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : "Create Exam"}
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Exam List Panel */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
                <h2 className="font-semibold">Available Exams</h2>
                <Button 
                  onClick={fetchExams} 
                  disabled={loading} 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-gray-700"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Refresh"}
                </Button>
              </div>
              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-6 text-center text-gray-500 flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p>Loading exams...</p>
                  </div>
                ) : exams.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p className="mb-4">No exams available.</p>
                    <Button 
                      onClick={() => setShowNewExamForm(true)} 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" /> Create Your First Exam
                    </Button>
                  </div>
                ) : (
                  <ul className="max-h-96 overflow-y-auto">
                    {exams.map((exam) => (
                      <li
                        key={exam.id}
                        className={`p-4 hover:bg-blue-50 transition-colors cursor-pointer ${selectedExam?.id === exam.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                        onClick={() => fetchExamDetails(exam.id)}
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-800 truncate">{exam.title}</h3>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Are you sure you want to delete this exam?")) {
                                deleteExam(exam.id);
                              }
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Exam Details & Student Submissions Panel */}
          <div className="md:col-span-2">
            {selectedExam ? (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loadingDetails ? (
                  <div className="p-6 text-center text-gray-500 flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p>Loading exam details...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-bold text-gray-800">{selectedExam.title}</h2>
                        <button
                          onClick={() => setSelectedExam(null)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="mt-4 space-y-3">
                        <div className="flex items-start">
                          <FileText className="w-5 h-5 text-gray-500 mr-2 mt-1" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Description</p>
                            <p className="text-gray-700">{selectedExam.description || "No description provided."}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <User className="w-5 h-5 text-gray-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Classroom</p>
                            <p className="text-gray-700">{selectedExam.classroom}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <Clock className="w-5 h-5 text-gray-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Deadline</p>
                            <p className="text-gray-700">{formatDate(selectedExam.deadline)}</p>
                          </div>
                        </div>

                        {selectedExam.content && (
                          <div className="flex items-center mt-2">
                            <FileText className="w-5 h-5 text-gray-500 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-gray-500">Exam Content</p>
                              <Button 
                                variant="link"
                                className="text-blue-600 hover:text-blue-800 p-0 h-auto font-medium flex items-center"
                                onClick={() => handleDownload(
                                  `${API_BASE_URL}/api/download/exams/${selectedExam.exam_uuid}`,
                                  `${selectedExam.title.replace(/\s+/g, '_')}_exam.pdf`
                                )}
                                disabled={downloading}
                              >
                                {downloading ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <FileText className="w-4 h-4 mr-1" />
                                )}
                                {downloading ? "Downloading..." : "Download Document"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Student Submissions Section */}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                        <User className="w-5 h-5 mr-2" /> Student Submissions
                      </h3>
                      
                      {studentWorks.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                          <p>No submissions received yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {studentWorks.map((work) => (
                            <div key={work.id} className="bg-gray-50 rounded-lg p-4 shadow-sm">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center">
                                  <User className="w-4 h-4 text-gray-500 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Student</p>
                                    <p className="text-gray-800">{work.student_name}</p>
                                    <p className="text-gray-500 text-sm">{work.student_email}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center">
                                  <Star className="w-4 h-4 text-yellow-500 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Grade</p>
                                    {editingGrade === work.id ? (
                                      <div className="flex items-center mt-1">
                                        <Input 
                                          value={gradeValue}
                                          onChange={(e) => setGradeValue(e.target.value)}
                                          className="w-20 mr-2 h-8 text-sm"
                                          placeholder="Grade"
                                        />
                                        <Button
                                          size="sm"
                                          className="h-8 w-8 p-0 mr-1"
                                          onClick={() => handleGradeSubmit(work.id)}
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0"
                                          onClick={() => setEditingGrade(null)}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center">
                                        <p className="text-gray-800 font-semibold">{work.note || "Not graded"}</p>
                                        <button
                                          onClick={() => handleGradeEditStart(work.id, work.note)}
                                          className="ml-2 text-gray-400 hover:text-blue-500 transition-colors"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                <div className="flex items-start">
                                  <MessageSquare className="w-4 h-4 text-gray-500 mr-2 mt-1" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Comment</p>
                                    <p className="text-gray-700">{work.commentaire || "No comment provided."}</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-4">
                                <Button 
                                  onClick={() => handleDownload(
                                    `${API_BASE_URL}/api/download/work/${work.id}`,
                                    `${work.student_name.replace(/\s+/g, '_')}_submission.pdf`
                                  )}
                                  disabled={downloading}
                                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                                >
                                  {downloading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                  )}
                                  {downloading ? "Downloading..." : "Download Submission"}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center h-full flex flex-col justify-center items-center text-gray-500">
                <FileText className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-xl font-medium mb-2">No Exam Selected</h3>
                <p className="mb-6">Select an exam from the list to view details</p>
                <Button 
                  onClick={() => setShowNewExamForm(true)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PlusCircle className="w-5 h-5 mr-2" /> Create New Exam
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}