import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";
import { Sparkles, ArrowRight, CheckCircle2, TrendingUp, Zap } from "lucide-react";

const Landingg = () => {
  const navigate = useNavigate();
  const [serverStatus, setServerStatus] = useState("Checking server...");

  // landing page load hote hi backend health check kar lete hain.
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await api("/handshake");
        const data = await response.json();
        console.log("Server connected:", data);
        setServerStatus("Server online");
      } catch (error) {
        console.log("Server connection failed:", error);
        setServerStatus("Server offline");
      }
    };

    checkServer();
  }, []);

  const features = [
    {
      icon: TrendingUp,
      title: "Smart Match Analysis",
      description: "Compare your resume against any job description with AI support.",
    },
    {
      icon: Sparkles,
      title: "Gap Detection",
      description: "See where your profile is strong and which skills still need work.",
    },
    {
      icon: Zap,
      title: "Instant Suggestions",
      description: "Get quick resume improvement suggestions tailored to the role.",
    },
    {
      icon: CheckCircle2,
      title: "Profile Tracking",
      description: "Keep your analyses, latest resume, and improved draft in one place.",
    },
  ];

  const steps = [
    {
      number: "1",
      title: "Create Your Profile",
      description: "Start with a lightweight account so your resume history can be saved.",
    },
    {
      number: "2",
      title: "Upload Resume",
      description: "Upload your latest PDF resume and let the app extract the text.",
    },
    {
      number: "3",
      title: "Paste Job Description",
      description: "Add the role, company, and JD you want to target.",
    },
    {
      number: "4",
      title: "Review Match Insights",
      description: "See score, strengths, gaps, and resume improvement suggestions.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#202020] text-white overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-amber-900/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-5xl mx-auto text-center">
            <div className="mb-8">
              <span className="inline-block px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-indigo-300 text-sm font-bold mb-6">
                AI-Powered Resume Match Analysis
              </span>

              <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
                Close the gap between your resume and the role you want
              </h1>

              <p className="text-xl md:text-2xl text-slate-300 mb-4 leading-relaxed">
                Upload your resume, paste a job description, and see how strong your chances
                look for that company.
              </p>
              <p className="text-slate-400">
                Match score, missing skills, and a better resume draft in one flow.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 items-center">
              <button
                onClick={() => {
                  const token = localStorage.getItem("token");
                  navigate(token ? "/Intakee" : "/Auth");
                }}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-black rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-900/50 flex items-center gap-3"
              >
                <Sparkles size={24} />
                Get Started
              </button>
            </div>

            <div className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-xs text-slate-400">{serverStatus}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-20 bg-gradient-to-b from-transparent to-indigo-900/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-4">What AlignAI Helps You Do</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Make your resume more targeted and understand how closely it matches a job.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={index}
                    className="bg-[#252525] border border-slate-800 p-8 rounded-2xl hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-900/20 group"
                  >
                    <div className="mb-4">
                      <div className="w-14 h-14 bg-indigo-600/20 rounded-xl flex items-center justify-center group-hover:bg-indigo-600/30 transition">
                        <Icon className="w-7 h-7 text-indigo-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-slate-400">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-black text-center mb-16">How It Works</h2>

            <div className="space-y-8">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center font-black text-lg">
                      {step.number}
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-slate-400">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-20 border-t border-slate-800">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-black mb-6">Ready to test your resume?</h2>
            <p className="text-slate-400 mb-8 text-lg">
              Use the same workflow your client will see: upload, analyze, improve, and track.
            </p>
            <button
              onClick={() => navigate("/Auth")}
              className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-black rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-indigo-900/50 inline-flex items-center gap-3"
            >
              <span>Start Now</span>
              <ArrowRight size={24} />
            </button>
          </div>
        </div>

        <div className="px-6 py-10 border-t border-slate-800 bg-slate-900/30">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-slate-400 text-sm">© 2024 AlignAI. All rights reserved.</p>
            <p className="text-slate-500 text-xs mt-2">Built with React, Express, Cloudinary, HuggingFace and Pinecone.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landingg;
