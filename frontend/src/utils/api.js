const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * Reusable fetch wrapper that automatically handles:
 * 1. Attaching dynamic JWT Bearer headers.
 * 2. Serializing JSON payloads.
 * 3. Preserving native form boundary headers for resume file uploads.
 */
export const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  // Clone headers or default to empty object
  const headers = {
    ...options.headers,
  };

  // If the payload is NOT FormData (which is used for file uploads), set JSON headers
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Inject token if present
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
};