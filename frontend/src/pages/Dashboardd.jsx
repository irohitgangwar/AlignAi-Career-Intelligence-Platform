// yeh Dashboard component hai — analysis ke results yahan render hote hain.
// User Intakee page se resume + JD submit karta hai → backend analysis karta hai → result yahan dikhta hai.
// 4 tabs hain: Overview (score+strengths), Gaps & Risks (evidence-backed gaps),
// Suggestions (before→after bullet rewrites), Improve Resume (AI rewrite + PDF download).
//
// Data flow:
// 1. Intakee.jsx analysis karwata hai aur result localStorage me save karta hai
// 2. Dashboard localStorage se data load karta hai (page reload pe bhi survive kare isliye)
// 3. User "Generate Improved Resume" click kare toh /improve-resume API call hoti hai
// 4. User "Download PDF" click kare toh /download-resume-pdf API call hoti hai
// 5. PDF blob aata hai jo browser me download trigger karta hai

// React hooks import — useEffect page load pe data load karne ke liye,
// useState har dynamic value (loading state, active tab, etc.) track karne ke liye.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";
import {
  Target,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Download,
  Sparkles,
  Loader2,
  Copy,
  FileText,
  ShieldAlert,
  ArrowRight,
  MessageSquareWarning,
  Tag,
  BookOpen,
} from "lucide-react";

const formatResumeToString = (resume) => {
  if (!resume) return "";
  if (typeof resume === "string") return resume;
  
  let text = "";
  if (resume.name) text += `${resume.name.toUpperCase()}\n`;
  if (resume.headline) text += `${resume.headline}\n\n`;
  
  if (Array.isArray(resume.summary) && resume.summary.length) {
    text += "SUMMARY\n";
    resume.summary.forEach(s => text += `- ${s}\n`);
    text += "\n";
  }
  
  if (Array.isArray(resume.skills) && resume.skills.length) {
    text += "SKILLS\n";
    text += resume.skills.join("  |  ") + "\n\n";
  }
  
  if (Array.isArray(resume.experience) && resume.experience.length) {
    text += "EXPERIENCE\n";
    resume.experience.forEach(exp => {
      text += `${exp.role} - ${exp.company}\n`;
      if (Array.isArray(exp.bullets) && exp.bullets.length) {
        exp.bullets.forEach(b => text += `  - ${b}\n`);
      }
      text += "\n";
    });
  }
  
  if (Array.isArray(resume.projects) && resume.projects.length) {
    text += "PROJECTS\n";
    resume.projects.forEach(p => {
      text += `${p.title}\n`;
      if (Array.isArray(p.bullets) && p.bullets.length) {
        p.bullets.forEach(b => text += `  - ${b}\n`);
      }
      text += "\n";
    });
  }
  
  if (Array.isArray(resume.education) && resume.education.length) {
    text += "EDUCATION\n";
    resume.education.forEach(edu => text += `- ${edu}\n`);
  }
  
  return text.trim();
};

export default function Dashboard() {
  // useNavigate hook — redirect karne ke liye use hota hai (jaise /Intakee pe bhejne ke liye)
  const navigate = useNavigate();

  // analysisData — localStorage se loaded analysis result (matchScore, vulnerabilities, suggestions, etc.)
  // null matlab abhi load nahi hua ya data nahi mila
  const [analysisData, setAnalysisData] = useState(null);

  // isLoading — page pehli baar load ho raha hai, data fetch ho raha hai localStorage se
  const [isLoading, setIsLoading] = useState(true);

  // improvedResume — AI-generated improved resume text (empty matlab abhi generate nahi hua)
  const [improvedResume, setImprovedResume] = useState("");
  const [improvedResumeObj, setImprovedResumeObj] = useState(null);

  // isGenerating — improved resume generate ho raha hai (AI API call chal rahi hai)
  // true hone pe "Generating..." spinner dikhta hai button pe
  const [isGenerating, setIsGenerating] = useState(false);

  // isDownloadingPdf — PDF generate ho rahi hai backend pe (download ho raha hai)
  // true hone pe "Generating PDF..." spinner dikhta hai
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // activeTab — kaun sa tab selected hai (overview, gaps, suggestions, improve)
  const [activeTab, setActiveTab] = useState("overview");

  // copySuccess — clipboard copy success feedback ke liye (2 second ke liye "Copied!" dikhata hai)
  const [copySuccess, setCopySuccess] = useState(false);

  // page load pe localStorage se analysis data load karo.
  // Agar data nahi mila toh Intake page pe redirect kar do.
  useEffect(() => {
    const data = localStorage.getItem("analysisData");

    if (!data) {
      navigate("/Intakee");
      return;
    }

    try {
      setAnalysisData(JSON.parse(data));
    } catch (error) {
      console.error("Data load error:", error);
      navigate("/Intakee");
      return;
    }

    setIsLoading(false);
  }, [navigate]);

  // improved resume generate karne ka handler.
  // Backend pe POST request bhejta hai resume text, JD, aur suggestions ke saath.
  // Response me improved resume text aata hai.
  const handleGenerateImprovedResume = async () => {
    const userId = localStorage.getItem("userId");

    setIsGenerating(true);

    try {
      const response = await api("/api/analysis/improve-resume", {
        method: "POST",
        body: JSON.stringify({
          resumeText: localStorage.getItem("resumeText") || "",
          jobDescription: localStorage.getItem("jobDescription") || "",
          improvements: analysisData?.improvementSuggestions || [],
          userId,
        }),
      }).then((res) => res.json());

      if (!response.success) {
        throw new Error(response.error || "Resume improvement failed");
      }

      const rawImproved = response.data.improvedResumeText;
      setImprovedResumeObj(rawImproved);

      const formatted = formatResumeToString(rawImproved);
      setImprovedResume(formatted);

      // agar userId hai toh improved resume ko profile me bhi save kar do
      if (userId) {
        await api(`/api/profile/${userId}/improved-resume`, {
          method: "PUT",
          body: JSON.stringify({
            improvedResumeText: rawImproved,
          }),
        });
      }
    } catch (error) {
      console.error("Error:", error);
      alert(error.message || "Could not improve resume");
    } finally {
      setIsGenerating(false);
    }
  };

  // PDF download handler — backend se PDF generate karwa ke browser me download trigger karta hai.
  // Backend pe improved resume text bhejta hai, response me PDF blob aata hai.
  const handleDownloadPdf = async () => {
    if (!improvedResume) return;

    setIsDownloadingPdf(true);

    try {
      const response = await api("/api/analysis/download-resume-pdf", {
        method: "POST",
        body: JSON.stringify({
          improvedResumeText: improvedResumeObj || improvedResume,
          candidateName: localStorage.getItem("userName") || "Candidate",
        }),
      });

      if (!response.ok) {
        throw new Error("PDF generation failed");
      }

      // response ko blob me convert karo aur browser download trigger karo
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "improved-resume.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download error:", error);
      alert(error.message || "Could not download PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // plain text download — fallback option agar PDF nahi chahiye
  const handleDownloadText = () => {
    if (!improvedResume) return;

    const blob = new Blob([improvedResume], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "improved-resume.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  // clipboard me copy karo aur 2 second ke liye success feedback dikhao
  const handleCopyText = () => {
    if (!improvedResume) return;
    navigator.clipboard.writeText(improvedResume);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // naya analysis start karne ke liye purana data clear karo aur Intake page pe jao
  const handleNewAnalysis = () => {
    localStorage.removeItem("analysisData");
    navigate("/Intakee");
  };

  // severity ke hisaab se color classes return karta hai — High=red, Medium=amber, Low=blue
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case "High":
        return {
          border: "border-red-500",
          bg: "bg-red-500/10",
          text: "text-red-400",
          badge: "bg-red-500/20 text-red-400",
        };
      case "Medium":
        return {
          border: "border-amber-500",
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          badge: "bg-amber-500/20 text-amber-400",
        };
      case "Low":
        return {
          border: "border-blue-500",
          bg: "bg-blue-500/10",
          text: "text-blue-400",
          badge: "bg-blue-500/20 text-blue-400",
        };
      default:
        return {
          border: "border-slate-500",
          bg: "bg-slate-500/10",
          text: "text-slate-400",
          badge: "bg-slate-500/20 text-slate-400",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#202020] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl font-bold">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-[#202020] flex items-center justify-center text-center">
        <div>
          <p className="text-white text-xl mb-4">No analysis data found</p>
          <button
            onClick={() => navigate("/Intakee")}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-500"
          >
            Start New Analysis
          </button>
        </div>
      </div>
    );
  }

  const { matchScore = 0, companyName = "Company", jobTitle = "Role" } = analysisData;

  return (
    <div className="min-h-screen bg-[#202020] text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* page header — company name, job title, aur action buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Analysis Report</h1>
            <p className="text-slate-400 mt-2 flex items-center gap-2">
              <Target size={18} className="text-indigo-400" />
              <span className="text-white font-bold underline decoration-indigo-500">
                {companyName} - {jobTitle}
              </span>
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleNewAnalysis}
              className="bg-indigo-600 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-500 transition"
            >
              New Analysis
            </button>
          </div>
        </div>

        {/* tab navigation — Overview, Gaps, Suggestions, Improve Resume */}
        <div className="flex gap-4 mb-8 border-b border-slate-800 overflow-x-auto">
          {[
            { id: "overview", label: "Overview" },
            { id: "gaps", label: "Gaps & Risks" },
            { id: "suggestions", label: "Suggestions" },
            { id: "improve", label: "Improve Resume" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-bold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-indigo-400 border-b-2 border-indigo-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============ OVERVIEW TAB ============ */}
        {/* overview tab — match score, match summary, aur strong points dikhata hai */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* circular progress bar — match score percentage dikhata hai */}
            <div className="bg-[#252525] border border-slate-800 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center">
              <h3 className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-6">
                Match Probability
              </h3>
              <div className="relative flex items-center justify-center">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-slate-800"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={440}
                    strokeDashoffset={440 - (440 * matchScore) / 100}
                    strokeLinecap="round"
                    className="text-indigo-500 transition-all duration-1000 ease-out"
                  />
                </svg>
                <span className="absolute text-5xl font-black italic text-indigo-400">
                  {matchScore}%
                </span>
              </div>
              <p className="mt-6 text-emerald-400 font-bold flex items-center gap-1 justify-center">
                <TrendingUp size={16} />
                {matchScore >= 70
                  ? "Strong Candidate"
                  : matchScore >= 50
                  ? "Good Match"
                  : "Needs Improvement"}
              </p>
            </div>

            {/* match summary card — AI ka overall assessment ek paragraph me */}
            <div className="md:col-span-2 bg-[#252525] border border-slate-800 p-8 rounded-[2.5rem]">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BookOpen className="text-indigo-400" size={22} /> Match Summary
              </h3>
              <p className="text-slate-300 leading-relaxed text-lg">
                {analysisData.matchSummary || "No summary available."}
              </p>
            </div>

            {/* strong points section — ab har strength ke saath resume evidence aur JD relevance hai */}
            <div className="md:col-span-3 bg-[#252525] border border-slate-800 p-8 rounded-[2.5rem]">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" size={22} /> Strong Points
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(analysisData.strongPoints || []).length ? (
                  analysisData.strongPoints.map((item, index) => {
                    // backward compatibility — agar purana plain string format hai toh handle karo
                    const isStructured = typeof item === "object" && item.point;

                    return (
                      <div
                        key={index}
                        className="bg-[#2a2a2a] p-5 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <CheckCircle2 className="text-emerald-500 mt-1 shrink-0" size={18} />
                          <h4 className="text-white font-bold text-lg">
                            {isStructured ? item.point : item}
                          </h4>
                        </div>

                        {/* agar structured data hai toh evidence aur relevance dikhao */}
                        {isStructured && (
                          <div className="ml-8 space-y-2">
                            <div className="bg-[#1a1a1a] rounded-xl p-3 border border-slate-800">
                              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                                Resume Evidence
                              </p>
                              <p className="text-slate-300 text-sm leading-relaxed">
                                {item.evidenceFromResume}
                              </p>
                            </div>
                            <div className="bg-[#1a1a1a] rounded-xl p-3 border border-slate-800">
                              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                                Why It Matters for This JD
                              </p>
                              <p className="text-slate-300 text-sm leading-relaxed">
                                {item.relevanceToJD}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-400 col-span-2">No strong points identified</p>
                )}
              </div>
            </div>

            {/* recommended keywords — JD me hain lekin resume me weak ya missing hain */}
            {(analysisData.recommendedKeywords || []).length > 0 && (
              <div className="md:col-span-3 bg-[#252525] border border-slate-800 p-8 rounded-[2.5rem]">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Tag className="text-indigo-400" size={22} /> Missing ATS Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisData.recommendedKeywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-full text-sm font-bold"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ GAPS & RISKS TAB ============ */}
        {/* gaps tab — expanded vulnerabilities dikhata hai with full evidence chain */}
        {activeTab === "gaps" && (
          <div className="space-y-6">
            <div className="bg-[#252525] border border-slate-800 p-8 rounded-[2.5rem]">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={22} /> Gaps & Interview Risks
              </h3>

              <div className="space-y-5">
                {(analysisData.vulnerabilities || []).length ? (
                  analysisData.vulnerabilities.map((gap, index) => {
                    // backward compatibility — purane {skill, severity, detail} format ko bhi handle karo
                    const isExpanded = gap.evidenceFromJD !== undefined;
                    const styles = getSeverityStyles(gap.severity);

                    return (
                      <div
                        key={index}
                        className={`bg-[#2a2a2a] rounded-2xl border-l-4 ${styles.border} overflow-hidden`}
                      >
                        {/* gap ka header — skill name aur severity badge */}
                        <div className="p-6 pb-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-lg text-white">{gap.skill}</h4>
                            <span
                              className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${styles.badge}`}
                            >
                              {gap.severity}
                            </span>
                          </div>

                          {/* agar expanded data hai toh full evidence chain dikhao */}
                          {isExpanded ? (
                            <div className="space-y-3">
                              {/* JD me kya likha hai jo yeh gap create karta hai */}
                              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-slate-800">
                                <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                                  JD Requirement
                                </p>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                  {gap.evidenceFromJD}
                                </p>
                              </div>

                              {/* resume me is baare me kya hai — ya "Not mentioned" */}
                              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-slate-800">
                                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                                  Your Resume Says
                                </p>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                  {gap.evidenceFromResume}
                                </p>
                              </div>

                              {/* yeh gap kyun matter karta hai — real impact */}
                              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-slate-800">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                  Why This Matters
                                </p>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                  {gap.whyItMatters}
                                </p>
                              </div>

                              {/* interviewer kya pooch sakta hai — interview risk */}
                              <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/20">
                                <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <ShieldAlert size={12} /> Interview Risk
                                </p>
                                <p className="text-red-300 text-sm leading-relaxed italic">
                                  "{gap.interviewRisk}"
                                </p>
                              </div>

                              {/* suggested resume fix — exact bullet jo paste kar sako */}
                              <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                                  Suggested Resume Fix
                                </p>
                                <p className="text-emerald-300 text-sm leading-relaxed">
                                  {gap.resumeFix}
                                </p>
                              </div>
                            </div>
                          ) : (
                            // fallback — purane format ke liye plain detail dikhao
                            <p className="text-slate-400 text-sm leading-relaxed">
                              {gap.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-400">No major gaps found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ SUGGESTIONS TAB ============ */}
        {/* suggestions tab — structured suggestions with before→after bullet rewrites */}
        {activeTab === "suggestions" && (
          <div className="bg-[#252525] border border-slate-800 p-8 rounded-[2.5rem]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="text-amber-400" size={24} /> Actionable Improvements
            </h3>
            <div className="space-y-5">
              {(analysisData.improvementSuggestions || []).length ? (
                analysisData.improvementSuggestions.map((suggestion, index) => {
                  // backward compatibility — agar purana plain string hai toh simple render karo
                  const isStructured =
                    typeof suggestion === "object" && suggestion.improvedBullet;

                  if (!isStructured) {
                    return (
                      <div
                        key={index}
                        className="bg-[#2a2a2a] p-6 rounded-2xl border border-slate-700"
                      >
                        <div className="flex items-start gap-3">
                          <div className="bg-indigo-500 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1 text-white font-bold text-xs">
                            {index + 1}
                          </div>
                          <p className="text-slate-300 leading-relaxed">{String(suggestion)}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className="bg-[#2a2a2a] rounded-2xl border border-slate-700 overflow-hidden"
                    >
                      {/* suggestion header — section tag aur number */}
                      <div className="p-6 pb-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-indigo-500 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
                            {index + 1}
                          </div>
                          <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase">
                            {suggestion.section}
                          </span>
                        </div>

                        {/* before → after comparison — current bullet vs improved bullet */}
                        <div className="space-y-3">
                          {/* current bullet — resume me abhi kya likha hai */}
                          <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/20">
                            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                              Current
                            </p>
                            <p className="text-slate-400 text-sm leading-relaxed line-through decoration-red-500/30">
                              {suggestion.currentBullet}
                            </p>
                          </div>

                          {/* arrow dikhao before aur after ke beech */}
                          <div className="flex justify-center">
                            <ArrowRight className="text-emerald-400 rotate-90" size={20} />
                          </div>

                          {/* improved bullet — yeh paste karo resume me */}
                          <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                              Improved
                            </p>
                            <p className="text-emerald-300 text-sm leading-relaxed font-medium">
                              {suggestion.improvedBullet}
                            </p>
                          </div>

                          {/* reason — yeh change kyun zaroori hai */}
                          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-slate-800">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Why This Helps
                            </p>
                            <p className="text-slate-300 text-sm leading-relaxed">
                              {suggestion.reason}
                            </p>
                          </div>

                          {/* warning — agar improvement unconfirmed experience assume karta hai */}
                          {suggestion.warning && (
                            <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/20 flex items-start gap-2">
                              <MessageSquareWarning
                                className="text-amber-400 shrink-0 mt-0.5"
                                size={16}
                              />
                              <p className="text-amber-300 text-sm leading-relaxed">
                                {suggestion.warning}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-400">No suggestions available</p>
              )}
            </div>
          </div>
        )}

        {/* ============ IMPROVE RESUME TAB ============ */}
        {/* improve resume tab — AI se improved resume generate karo aur PDF download karo */}
        {activeTab === "improve" && (
          <div className="bg-[#252525] border border-slate-800 p-8 rounded-[2.5rem]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="text-amber-400" size={24} /> Improve Resume
            </h3>

            {!improvedResume ? (
              <div className="text-center py-12">
                <p className="text-slate-300 mb-6">
                  AI tumhare current resume ko JD ke hisaab se better version me rewrite karega.
                  Fake skills add nahi karega — sirf wording, structure aur keywords improve hoge.
                </p>
                <button
                  onClick={handleGenerateImprovedResume}
                  disabled={isGenerating}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 mx-auto transition-all"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Generate Improved Resume
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* improved resume text area — read-only, user dekh sakta hai */}
                <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                  <p className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    Improved resume ready — download as PDF or copy text
                  </p>
                  <textarea
                    value={improvedResume}
                    readOnly
                    rows={15}
                    className="w-full bg-[#1a1a1a] border border-slate-700 rounded-xl px-4 py-3 text-slate-300 font-mono text-sm resize-none focus:outline-none"
                  />
                </div>

                {/* action buttons — PDF download (primary), Copy, Text download (secondary) */}
                <div className="flex gap-3 flex-wrap">
                  {/* PDF download button — primary action, backend se PDF generate karwa ke download karega */}
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloadingPdf}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isDownloadingPdf ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Download PDF
                      </>
                    )}
                  </button>

                  {/* copy button — clipboard me copy karta hai */}
                  <button
                    onClick={handleCopyText}
                    className="flex-1 bg-[#2a2a2a] border border-slate-700 hover:bg-[#333] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={18} />
                    {copySuccess ? "Copied!" : "Copy Text"}
                  </button>

                  {/* text download — fallback, plain .txt file download */}
                  <button
                    onClick={handleDownloadText}
                    className="bg-[#2a2a2a] border border-slate-700 hover:bg-[#333] text-white font-bold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <FileText size={18} />
                    .txt
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
