import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";
import {
  User,
  Mail,
  Briefcase,
  Calendar,
  HistoryIcon,
  Loader2,
  Settings,
  LogOut,
  Star,
  FileText,
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    currentRole: "",
    experience: 0,
  });

  useEffect(() => {
    const loadProfile = async () => {
      const userId = localStorage.getItem("userId");

      if (!userId) {
        navigate("/Auth");
        return;
      }

      try {
        const response = await api(`/api/profile/${userId}`).then((res) =>
          res.json()
        );

        if (!response.success) {
          throw new Error(response.error || "Profile not found");
        }

        setProfile(response.data);
        setAnalyses(response.data.analyses || []);
        setEditForm({
          name: response.data.name || "",
          email: response.data.email || "",
          currentRole: response.data.currentRole || "",
          experience: response.data.experience || 0,
        });
      } catch (error) {
        console.error("Profile load error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleUpdateProfile = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const response = await api(`/api/profile/${userId}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      }).then((res) => res.json());

      if (!response.success) {
        throw new Error(response.error || "Profile update failed");
      }

      localStorage.setItem("userName", response.data.name);
      localStorage.setItem("userEmail", response.data.email);
      setProfile(response.data);
      setIsEditing(false);
    } catch (error) {
      alert(error.message || "Could not update profile");
    }
  };

  const handleOpenAnalysis = (analysis) => {
    localStorage.setItem("analysisData", JSON.stringify(analysis.analysisData));
    navigate("/Dashboardd");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#202020] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl font-bold">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#202020] flex items-center justify-center text-center">
        <div>
          <p className="text-white text-xl mb-4">Profile not found</p>
          <button
            onClick={() => navigate("/")}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-500"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#202020] text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight">My Profile</h1>
            <p className="text-slate-400 mt-2">
              Member since: {new Date(profile.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0 flex-wrap">
            <button
              onClick={() => navigate("/Intakee")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition flex items-center gap-2"
            >
              <Star size={18} /> New Analysis
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                navigate("/");
              }}
              className="bg-[#2a2a2a] border border-slate-700 hover:bg-[#333] text-white font-bold py-3 px-6 rounded-xl transition flex items-center gap-2"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-1 bg-[#252525] border border-slate-800 p-8 rounded-[2rem]">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-indigo-600 rounded-full mx-auto flex items-center justify-center mb-4">
                <User size={40} />
              </div>
              <h2 className="text-2xl font-bold">{profile.name}</h2>
              <p className="text-slate-400 text-sm mt-2">{profile.currentRole}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-[#2a2a2a] p-4 rounded-xl">
                <Mail size={18} className="text-indigo-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-white font-semibold break-all">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#2a2a2a] p-4 rounded-xl">
                <Briefcase size={18} className="text-indigo-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-slate-400">Experience</p>
                  <p className="text-white font-semibold">{profile.experience} years</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#2a2a2a] p-4 rounded-xl">
                <Calendar size={18} className="text-indigo-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-slate-400">Last Updated</p>
                  <p className="text-white font-semibold">
                    {new Date(profile.updatedAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#2a2a2a] p-4 rounded-xl">
                <FileText size={18} className="text-indigo-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-slate-400">Latest Resume</p>
                  <p className="text-white font-semibold break-all">
                    {profile.resumeFileName || "No resume uploaded yet"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditing((current) => !current)}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Settings size={18} /> {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#252525] border border-slate-800 p-6 rounded-[1.5rem]">
              <p className="text-slate-400 text-sm font-semibold">Total Analyses</p>
              <p className="text-4xl font-black text-indigo-400 mt-2">{analyses.length}</p>
            </div>

            <div className="bg-[#252525] border border-slate-800 p-6 rounded-[1.5rem]">
              <p className="text-slate-400 text-sm font-semibold">Average Score</p>
              <p className="text-4xl font-black text-emerald-400 mt-2">
                {analyses.length
                  ? Math.round(
                      analyses.reduce(
                        (sum, item) => sum + (item.analysisData?.matchScore || 0),
                        0
                      ) / analyses.length
                    )
                  : 0}
                %
              </p>
            </div>

            <div className="bg-[#252525] border border-slate-800 p-6 rounded-[1.5rem]">
              <p className="text-slate-400 text-sm font-semibold">Stored Resumes</p>
              <p className="text-4xl font-black text-blue-400 mt-2">
                {(profile.resumeHistory || []).length + (profile.resumeFileUrl ? 1 : 0)}
              </p>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="bg-[#252525] border border-slate-800 p-8 rounded-[2rem] mb-10">
            <h3 className="text-2xl font-bold mb-6">Edit Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input
                type="text"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full bg-[#2a2a2a] border border-slate-700 rounded-xl px-4 py-3 text-white"
                placeholder="Full Name"
              />
              <input
                type="email"
                value={editForm.email}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full bg-[#2a2a2a] border border-slate-700 rounded-xl px-4 py-3 text-white"
                placeholder="Email"
              />
              <input
                type="text"
                value={editForm.currentRole}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    currentRole: event.target.value,
                  }))
                }
                className="w-full bg-[#2a2a2a] border border-slate-700 rounded-xl px-4 py-3 text-white"
                placeholder="Current Role"
              />
              <input
                type="number"
                value={editForm.experience}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    experience: Number(event.target.value),
                  }))
                }
                className="w-full bg-[#2a2a2a] border border-slate-700 rounded-xl px-4 py-3 text-white"
                placeholder="Experience"
              />
            </div>

            <button
              onClick={handleUpdateProfile}
              className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition"
            >
              Save
            </button>
          </div>
        )}

        <div className="bg-[#252525] border border-slate-800 p-8 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-8">
            <HistoryIcon className="text-indigo-400" size={24} />
            <h3 className="text-2xl font-bold">Analysis History</h3>
          </div>

          {analyses.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  onClick={() => handleOpenAnalysis(analysis)}
                  className="bg-[#2a2a2a] p-6 rounded-2xl border border-slate-700 hover:border-indigo-500 hover:bg-[#303030] cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-white font-bold text-lg">{analysis.companyName}</h4>
                      <p className="text-slate-400 text-sm">{analysis.jobTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-indigo-400">
                        {analysis.analysisData?.matchScore || 0}%
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(analysis.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-4">No analyses yet</p>
              <button
                onClick={() => navigate("/Intakee")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-xl transition"
              >
                Create First Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
