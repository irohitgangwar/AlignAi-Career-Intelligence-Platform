import React, { useState } from "react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const nextErrors = {};

    if (!isLogin && !formData.name.trim()) {
      nextErrors.name = "Name is required";
    }

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      nextErrors.email = "Enter valid email";
    }

    if (!formData.password || formData.password.length < 6) {
      nextErrors.password = "Min 6 characters";
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  
 const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email, password: formData.password };

      // Submit credentials to the real authentication backend
      const response = await api(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      }).then((res) => res.json());

      if (!response.success) {
        throw new Error(response.error || `${isLogin ? "Login" : "Registration"} failed.`);
      }

      // Store authentic credentials and token inside client memory
      localStorage.setItem("token", response.token);
      localStorage.setItem("userId", response.data.userId);
      localStorage.setItem("userEmail", response.data.email);
      localStorage.setItem("userName", response.data.name);

      // Redirect user to resume intake
      navigate("/Intakee");
    } catch (error) {
      console.error("Authentication action failed:", error);
      setErrors({ submit: error.message || "An authentication error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };


  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-[#202020] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>
          <p className="mt-2 text-slate-400">
            Resume analysis aur profile history yahan se start hoti hai.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white"
                  />
                </div>
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white"
                />
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? "Processing..." : isLogin ? "Login" : "Create Account"}
              {!isLoading && <ArrowRight size={18} />}
            </button>

            {errors.submit && <p className="text-red-400 text-center text-sm">{errors.submit}</p>}
          </form>

          <p className="mt-6 text-center text-slate-400 text-sm">
            {isLogin ? "Do not have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setIsLogin((current) => !current);
                setErrors({});
                setFormData({
                  name: "",
                  email: "",
                  password: "",
                  confirmPassword: "",
                });
              }}
              className="text-indigo-400 hover:text-indigo-300 font-bold"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>

          <div className="mt-6 pt-6 border-t border-white/10">
            <Link
              to="/"
              className="w-full text-center block bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold py-3 rounded-xl transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
