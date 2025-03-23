"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, FileText, User, Clock, MessageSquare, Send, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/ui/Navbar";

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileInput, setFileInput] = useState(null);
  const [commentaire, setCommentaire] = useState("");
  const [submission, setSubmission] = useState(null);
  const [showExamContent, setShowExamContent] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";


  useEffect(() => {
    fetchAssignments();
  }, []);

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


  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load assignments.");
      const data = await res.json();
      setAssignments(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchAssignmentDetails = async (id) => {
    setLoadingDetails(true);
    setSubmitError("");
    setSubmitSuccess("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/${id}/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch assignment details.");
      const data = await res.json();
      setSelectedAssignment(data);
      
      checkSubmission(id);
    } catch (err) {
      console.error(err);
    }
    setLoadingDetails(false);
  };

  const checkSubmission = async (assignmentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/work/student/${assignmentId}/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        
        if (data.status === false) {
          console.log("No submission yet, exam_uuid:", data.exam_uuid);
          setSubmission(null);
          setShowExamContent(true); // Always show exam content if no submission
        } else {
          console.log("Submission data:", data);
          setSubmission(data);
          setShowExamContent(false); // Hide exam content by default after submission
        }
      } else {
        // console.error("Failed to check submission status");
        setSubmission(null);
        setShowExamContent(true); // Show exam content if submission check fails
      }
    } catch (err) {
      console.error(err);
      setSubmission(null);
      setShowExamContent(true); // Show exam content if submission check errors
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");
    
    // Validation
    if (!fileInput) {
      setSubmitError("Please select a file to upload");
      return;
    }

    if (fileInput.type !== 'application/pdf') {
      setSubmitError("Only PDF files are allowed");
      return;
    }
    
    if (!selectedAssignment || !selectedAssignment.exam_uuid) {
      setSubmitError("Please select a valid assignment");
      return;
    }

    // Check file size (optional)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileInput.size > maxSize) {
      setSubmitError(`File size exceeds 10MB limit. Your file is ${(fileInput.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("content", fileInput);
    formData.append("commentaire", commentaire);
    formData.append("exam", selectedAssignment.exam_uuid);

    try {
      console.log("Submitting form data:", {
        file: fileInput.name,
        exam: selectedAssignment.exam_uuid,
        commentLength: commentaire.length
      });
      
      const res = await fetch(`${API_BASE_URL}/api/work/submit/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("jwt")}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorData = JSON.parse(errorText);
          console.error("Submission error:", errorData);
          setSubmitError(`Failed to submit: ${JSON.stringify(errorData)}`);
        } catch (e) {
          console.error("Submission error (non-JSON):", errorText);
          setSubmitError(`Failed to submit: ${errorText}`);
        }
        throw new Error("Failed to submit assignment.");
      }
      
      setSubmitSuccess("Assignment submitted successfully!");
      setFileInput(null);
      setCommentaire("");
      setShowExamContent(false); // Hide exam content after successful submission
      
      // Refresh submission data
      setTimeout(() => {
        checkSubmission(selectedAssignment.id);
      }, 1000);
    } catch (err) {
      console.error("Exception:", err);
      if (!submitError) {
        setSubmitError(`Error submitting assignment: ${err.message}`);
      }
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

  const isDeadlinePassed = (deadline) => {
    return new Date(deadline) < new Date();
  };

  // Safely compare IDs, handling undefined/null values
  const safelyCompareIds = (id1, id2) => {
    if (id1 == null || id2 == null) return false;
    return String(id1) === String(id2);
  };

  const getStatusBadge = (assignment) => {
    // Safely compare IDs
    const isSelected = selectedAssignment && safelyCompareIds(selectedAssignment.id, assignment.id);
    
    if (isSelected) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 rounded-full">
          Selected
        </span>
      );
    }
    
    const isSubmitted = submission && safelyCompareIds(submission.exam_uuid, assignment.exam_uuid);
    
    if (isSubmitted) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          Valider
        </span>
      );
    } else if (isDeadlinePassed(assignment.deadline)) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
          En retard
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          En cours
        </span>
      );
    }
  };

  // Function to check if submission has a grade assigned
  const hasGrade = (submission) => {
    if (!submission) return false;
    
    // Check direct note property
    if (submission.note !== undefined && submission.note !== null) {
      return true;
    }
    
    // Check nested submission structure
    if (submission.submission && submission.submission.note !== undefined && submission.submission.note !== null) {
      return true;
    }
    
    // Check student_works array
    if (submission.student_works && submission.student_works.length > 0) {
      return submission.student_works[0].note !== undefined && submission.student_works[0].note !== null;
    }
    
    return false;
  };

  // Function to get the note/grade from the submission, handling different response structures
  const getSubmissionGrade = () => {
    if (!submission) return null;
    
    // Check for direct note property first
    if (submission.note !== undefined && submission.note !== null) {
      return submission.note;
    }
    
    // Check for nested submission structure
    if (submission.submission && submission.submission.note !== undefined) {
      return submission.submission.note;
    }
    
    // Check for student_works array as a fallback
    if (submission.student_works && submission.student_works.length > 0) {
      return submission.student_works[0].note;
    }
    
    return null;
  };

  // Function to get the feedback from the submission, handling different response structures
  const getSubmissionFeedback = () => {
    if (!submission) return null;
    
    if (submission.feedback !== undefined && submission.feedback !== null) {
      return submission.feedback;
    }
    
    if (submission.student_works && submission.student_works.length > 0 && 
        submission.student_works[0].feedback !== undefined) {
      return submission.student_works[0].feedback;
    }
    
    return null;
  };

  // Function to get the submission content link
  const getSubmissionContent = () => {
    if (!submission) return null;
    
    if (submission.content) {
      return submission.content;
    }
    
    if (submission.student_works && submission.student_works.length > 0) {
      return submission.student_works[0].content;
    }
    
    return null;
  };

  // Function to get the submission comment
  const getSubmissionComment = () => {
    if (!submission) return null;
    
    if (submission.commentaire) {
      return submission.commentaire;
    }
    
    if (submission.student_works && submission.student_works.length > 0) {
      return submission.student_works[0].commentaire;
    }
    
    return null;
  };

  // Function to display grade status in the assignment list
  const getGradeIndicator = (assignmentId) => {
    if (submission && safelyCompareIds(submission.exam_uuid || submission.exam, assignmentId) && hasGrade(submission)) {
      const grade = getSubmissionGrade();
      return (
        <div className="mt-1 flex items-center text-sm text-blue-600">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Note: {grade}</span>
        </div>
      );
    }
    return null;
  };

  // Toggle function for showing/hiding exam content
  const toggleExamContent = () => {
    setShowExamContent(!showExamContent);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">My Assignments</h1>
          <Button 
            onClick={fetchAssignments} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Actualiser"}
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Assignment List Panel */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
                <h2 className="font-semibold">Available Assignments</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-6 text-center text-gray-500 flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p>Loading assignments...</p>
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p>No assignments available.</p>
                  </div>
                ) : (
                  <ul className="max-h-96 overflow-y-auto">
                    {assignments.map((assignment) => {
                      // Safely compare IDs
                      const isSelected = selectedAssignment && 
                        safelyCompareIds(selectedAssignment.id, assignment.id);
                        
                      return (
                        <li
                          key={assignment.id}
                          className={`p-4 hover:bg-blue-50 transition-colors cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-100 border-l-4 border-blue-500 shadow-sm' 
                              : ''
                          }`}
                          onClick={() => fetchAssignmentDetails(assignment.id)}
                        >
                          <div className="flex justify-between items-center">
                            <h3 className={`text-gray-800 truncate ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                              {assignment.title}
                            </h3>
                            {getStatusBadge(assignment)}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">Due: {formatDate(assignment.deadline)}</p>
                          {getGradeIndicator(assignment.id)}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Assignment Details & Submission Panel */}
          <div className="md:col-span-2">
            {selectedAssignment ? (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loadingDetails ? (
                  <div className="p-6 text-center text-gray-500 flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p>Loading assignment details...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-bold text-gray-800">{selectedAssignment.title}</h2>
                        <button
                          onClick={() => setSelectedAssignment(null)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {/* Deadline and classroom info - always visible */}
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center">
                          <User className="w-5 h-5 text-gray-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Classroom</p>
                            <p className="text-gray-700">{selectedAssignment.classroom}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <Clock className="w-5 h-5 text-gray-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Deadline</p>
                            <p className={`${isDeadlinePassed(selectedAssignment.deadline) ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                              {formatDate(selectedAssignment.deadline)}
                              {isDeadlinePassed(selectedAssignment.deadline) && ' (Overdue)'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Submission Status Section */}
                      {submission && (
                        <div className="mt-4 flex justify-between items-center">
                          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            Assignment Submitted
                          </div>
                          
                          <Button
                            onClick={toggleExamContent}
                            variant="outline"
                            size="sm"
                            className="flex items-center text-gray-600"
                          >
                            {showExamContent ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-1" />
                                Hide Exam Content
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                View Exam Content
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      
                      {/* Exam content - conditionally visible */}
                      {(!submission || showExamContent) && (
                        <div className="mt-4">
                          <div className="flex items-start">
                            <FileText className="w-5 h-5 text-gray-500 mr-2 mt-1" />
                            <div>
                              <p className="text-sm font-medium text-gray-500">Description</p>
                              <p className="text-gray-700">{selectedAssignment.description || "No description provided."}</p>
                            </div>
                          </div>
                          
                          {selectedAssignment.content && (
                            <div className="mt-4">
                              <Button 
                                variant="link"
                                className="text-blue-600 hover:text-blue-800 p-0 h-auto font-medium flex items-center"
                                onClick={() => handleDownload(
                                  `${API_BASE_URL}/api/download/exams/${selectedAssignment.exam_uuid}`,
                                  `${selectedAssignment.title.replace(/\s+/g, '_')}_exam.pdf`
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
                          )}
                        </div>
                      )}
                    </div>

                    {/* Submission Section */}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                        <MessageSquare className="w-5 h-5 mr-2" /> Your Submission
                      </h3>
                      
                      {/* Show success message if exists */}
                      {submitSuccess && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-start">
                          <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <p>{submitSuccess}</p>
                        </div>
                      )}
                      
                      {/* Show error message if exists */}
                      {submitError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start">
                          <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <p>{submitError}</p>
                        </div>
                      )}
                      
                      {submission ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                          <div className="flex items-center text-green-700 mb-4">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                            <h4 className="font-medium">Assignment Submitted</h4>
                          </div>
                          
                          {/* Submission file link */}
                          {getSubmissionContent() && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-500 mb-1">Your Submission</p>
                              <a 
                                href={getSubmissionContent()} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center p-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow text-blue-600"
                              >
                                <FileText className="w-5 h-5 mr-2" />
                                View Your Submission
                              </a>
                            </div>
                          )}
                          
                          {getSubmissionComment() && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-500 mb-1">Your Comment</p>
                              <p className="text-gray-700 p-3 bg-white rounded-md">{getSubmissionComment()}</p>
                            </div>
                          )}
                          
                          {hasGrade(submission) && (
                            <div className="mt-4 p-4 bg-blue-100 border border-blue-200 rounded-md shadow">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="mr-3 bg-blue-500 rounded-full p-2">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Note</p>
                                    <p className="text-3xl font-bold text-blue-700">{getSubmissionGrade()}</p>
                                  </div>
                                </div>
                              </div>
                              
                              {getSubmissionFeedback() && (
                                <div className="mt-4 border-t border-blue-200 pt-4">
                                  <p className="text-sm font-medium text-gray-700 mb-2">Teacher Feedback</p>
                                  <div className="bg-white p-3 rounded-md shadow-sm">
                                    <p className="text-gray-700">{getSubmissionFeedback()}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                          <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Upload Your Work
                            </label>
                            <div className="flex items-center">
                              <div className="w-full">
                                <label className="cursor-pointer bg-white p-4 border border-gray-300 border-dashed rounded-lg flex flex-col items-center justify-center w-full hover:bg-gray-50 transition-colors">
                                  <FileText className="w-8 h-8 text-gray-400 mb-2" />
                                  <p className="text-sm text-gray-500 text-center">
                                    {fileInput ? fileInput.name : "Click to select a file or drag and drop"}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Maximum file size: 10MB
                                  </p>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf"
                                    onChange={(e) => setFileInput(e.target.files[0])}
                                    required
                                  />
                                </label>
                                {fileInput && (
                                  <div className="mt-2 flex justify-between items-center">
                                    <p className="text-sm text-gray-600">
                                      Selected: {fileInput.name} ({(fileInput.size / 1024).toFixed(2)} KB)
                                    </p>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      className="text-red-500 hover:text-red-700 p-1 h-auto"
                                      onClick={() => setFileInput(null)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Add a Comment (Optional)
                            </label>
                            <Textarea
                              placeholder="Any notes or comments about your submission..."
                              value={commentaire}
                              onChange={(e) => setCommentaire(e.target.value)}
                              className="w-full resize-none bg-white"
                              rows={4}
                            />
                          </div>
                          
                          <div className="flex flex-col md:flex-row md:justify-between items-center gap-4">
                            <div>
                              {isDeadlinePassed(selectedAssignment.deadline) && (
                                <div className="p-2 bg-red-50 text-red-600 text-sm rounded-md">
                                  <span className="font-semibold">Warning:</span> The deadline has passed
                                </div>
                              )}
                            </div>
                            <Button 
                              type="submit" 
                              disabled={submitting || isDeadlinePassed(selectedAssignment.deadline)} 
                              className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center w-full md:w-auto justify-center"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <Send className="w-5 h-5 mr-2" />
                                  Submit Assignment
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center h-full flex flex-col justify-center items-center text-gray-500">
                <FileText className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-xl font-medium mb-2">No Assignment Selected</h3>
                <p>Select an assignment from the list to view details and submit your work</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}