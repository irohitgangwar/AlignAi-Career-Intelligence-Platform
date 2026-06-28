import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";
import {
  Upload,
  Building2,
  ArrowRight,
  ArrowLeft,
  Zap,
  Loader2,
  FileText,
  Sparkles,
} from "lucide-react";

const REQUEST_TIMEOUT_MS = 120000;

async function fetchJson(endpoint, options = {}) {
  // request bahut der tak pending na rahe, isliye timeout ke saath API call kar rahe hain.
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await api(endpoint, {
      ...options,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(
        data.details || data.error || data.message || `Request failed with ${response.status}`
      );
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Analysis request timed out. Please retry after checking backend/Hugging Face access.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function Intake() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");

  const handleNext = () => setStep((current) => Math.min(current + 1, 2));
  const handleBack = () => setStep((current) => Math.max(current - 1, 0));

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      alert("Please upload only PDF file");
      return;
    }

    setFile(selectedFile);
    setUploadedFileName(selectedFile.name);
  };

  const handleRunAnalysis = async () => {
    if (!file || !jobDescription.trim() || !companyName.trim()) {
      alert("Please fill all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const userId = localStorage.getItem("userId") || `user_${Date.now()}`;
      const userName = localStorage.getItem("userName") || "User";
      const userEmail =
        localStorage.getItem("userEmail") || `${userId}@alignai.local`;

      localStorage.setItem("userId", userId);

      // profile ko pehle sync kar rahe hain taaki backend ke paas user ka base record ho.
      await fetchJson("/api/profile/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: userName,
          email: userEmail,
          currentRole: jobTitle || "Candidate",
        }),
      });

      const formData = new FormData();
      formData.append("resume", file);
      formData.append("userId", userId);
      formData.append("name", userName);
      formData.append("email", userEmail);
      formData.append("currentRole", jobTitle || "Candidate");

      const uploadResponse = await fetchJson("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.success) {
        throw new Error(
          [uploadResponse.message, uploadResponse.error].filter(Boolean).join(": ") ||
            "Resume upload failed"
        );
      }

      const analysisResponse = await fetchJson("/api/analysis/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: uploadResponse.resumeText,
          jobDescription,
          userId,
          companyName,
          jobTitle,
        }),
      });

      if (!analysisResponse.success) {
        throw new Error(
          analysisResponse.details || analysisResponse.error || "Analysis failed"
        );
      }

      // analysis response se payload bana rahe hain dashboard ke liye.
      // engineeringSignals hata diya hai — ab strongPoints me evidence aur JD relevance hai.
      const analysisPayload = {
        matchScore: analysisResponse.data.matchScore,
        matchSummary: analysisResponse.data.matchSummary,
        strongPoints: analysisResponse.data.strongPoints || [],
        vulnerabilities: analysisResponse.data.vulnerabilities || [],
        improvementSuggestions: analysisResponse.data.improvementSuggestions || [],
        recommendedKeywords: analysisResponse.data.recommendedKeywords || [],
        companyName,
        jobTitle,
        resumeFileUrl: uploadResponse.fileUrl,
        resumeFileName: uploadResponse.fileName,
      };

      await fetchJson(`/api/profile/${userId}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          jobTitle,
          jobDescription,
          analysisData: analysisPayload,
        }),
      });

      localStorage.setItem("resumeText", uploadResponse.resumeText);
      localStorage.setItem("jobDescription", jobDescription);
      localStorage.setItem("analysisData", JSON.stringify(analysisPayload));

      navigate("/Dashboardd");
    } catch (error) {
      console.error("Error:", error);
      alert(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#202020] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative">
          <Loader2 className="w-20 h-20 text-indigo-500 animate-spin" />
          <Sparkles className="absolute -top-2 -right-2 text-amber-400 animate-pulse" />
        </div>
        <h2 className="text-3xl font-black text-white mt-8 mb-2 tracking-tight">
          AI analysis is running...
        </h2>
        <p className="text-slate-400 max-w-sm leading-relaxed">
          Resume aur job description ko compare kiya ja raha hai.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#202020] text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-[#252525] border border-slate-800 p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="flex gap-3 mb-12">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${
                item <= step
                  ? "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                  : "bg-slate-800"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Building2 className="text-indigo-400" size={28} />
              <h2 className="text-2xl font-bold">Company and Role</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Example: Google"
                  className="w-full bg-[#2a2a2a] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  placeholder="Example: MERN Developer"
                  className="w-full bg-[#2a2a2a] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Job Description
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  rows={6}
                  placeholder="Paste full JD here..."
                  className="w-full bg-[#2a2a2a] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <FileText className="text-indigo-400" size={28} />
              <h2 className="text-2xl font-bold">Upload Resume</h2>
            </div>

            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer group">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="resume-upload"
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                <div className="group-hover:scale-110 transition-transform">
                  <Upload className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                </div>
                <p className="text-white font-bold text-lg">
                  {uploadedFileName || "Click to upload resume PDF"}
                </p>
                <p className="text-slate-400 text-sm mt-2">Max 2MB, PDF only</p>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Zap className="text-indigo-400" size={28} />
              <h2 className="text-2xl font-bold">Review Summary</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-[#2a2a2a] rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-sm">Company</p>
                <p className="text-white font-bold mt-1">{companyName || "-"}</p>
              </div>
              <div className="bg-[#2a2a2a] rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-sm">Job Title</p>
                <p className="text-white font-bold mt-1">{jobTitle || "-"}</p>
              </div>
              <div className="bg-[#2a2a2a] rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-sm">Resume</p>
                <p className="text-white font-bold mt-1">{uploadedFileName || "-"}</p>
              </div>
            </div>

            <button
              onClick={handleRunAnalysis}
              disabled={!file || !jobDescription.trim() || !companyName.trim()}
              className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/50"
            >
              <Sparkles size={20} />
              Start Analysis
            </button>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="flex-1 bg-[#2a2a2a] border border-slate-700 hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <button
            onClick={handleNext}
            disabled={
              step === 2 ||
              (step === 0 && (!jobDescription.trim() || !companyName.trim())) ||
              (step === 1 && !file)
            }
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Next <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
