import React from "react";
import { BrainCircuit, PieChart, User, LogOut } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  // Hinglish: localStorage se quick auth state read kar rahe hain.
  const userName = localStorage.getItem("userName") || "User";
  const isLoggedIn = localStorage.getItem("userId") !== null;

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("analysisData");
    navigate("/Auth");
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-white/10 bg-[#202020]/80">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/50">
              <BrainCircuit size={22} strokeWidth={2.5} />
            </div>
            <span className="font-black text-xl tracking-tight text-white">AlignAI</span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {isLoggedIn && (
              <>
                <NavLink
                  to="/Intakee"
                  className={({ isActive }) => `flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-400"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  <PieChart size={18} />
                  <span className="font-medium">Analysis</span>
                </NavLink>

                <NavLink
                  to="/Profile"
                  className={({ isActive }) => `flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-400"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  <User size={18} />
                  <span className="font-medium">Profile</span>
                </NavLink>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              <div className="hidden sm:flex items-center space-x-3 pr-4 border-r border-slate-700">
                <div className="text-right">
                  <p className="text-white font-semibold text-sm">{userName}</p>
                  <p className="text-slate-400 text-xs">Member</p>
                </div>
              </div>

              <NavLink to="/Profile">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-500 cursor-pointer transition hover:shadow-lg hover:shadow-indigo-600/50">
                  <User size={20} />
                </div>
              </NavLink>

              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-slate-100 hover:border-slate-600 cursor-pointer transition"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <NavLink to="/Auth">
                <button className="hidden sm:block px-6 py-2 rounded-lg text-slate-300 hover:text-white font-semibold transition hover:bg-white/5">
                  Login
                </button>
              </NavLink>

              <NavLink to="/Auth">
                <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition shadow-lg shadow-indigo-900/50">
                  Sign Up
                </button>
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
