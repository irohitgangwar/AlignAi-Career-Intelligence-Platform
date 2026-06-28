import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

/**
 * Middleware to intercept API calls, extract and verify Bearer JWT tokens.
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Retrieve the token from Authorization header (format: "Bearer <token>")
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer")) {
    token = authHeader.split(" ")[1];
  }

  // 2. Reject if token is missing
  if (!token) {
    logger.warn("Request rejected: Token missing");
    return res.status(401).json({
      success: false,
      error: "Unauthorized access",
      details: "No authentication token provided. Please log in.",
    });
  }

  try {
    // 3. Cryptographically verify the token signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach token claims (userId, email) to req object for downstream use
    req.user = decoded;
    next();
  } catch (error) {
    logger.error("JWT token verification failed", error);
    
    const message = error.name === "TokenExpiredError" 
      ? "Your session has expired. Please log in again." 
      : "Invalid token credentials.";

    return res.status(401).json({
      success: false,
      error: "Unauthorized access",
      details: message,
    });
  }
};

/**
 * Middleware to enforce Resource Ownership boundaries.
 * Guarantees that user X can only edit/view user X's assets.
 */
export const verifyOwnership = (req, res, next) => {
  if (!req.user) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Configuration Error",
      details: "Ownership check was invoked without prior authentication checks.",
    });
  }

  const { userId } = req.params;

  // If endpoint specifies a target userId parameter, ensure it matches token's claim
  if (userId && req.user.userId !== userId) {
    logger.warn("Blocked illegal cross-user data access request", {
      loggedInUser: req.user.userId,
      targetUser: userId,
    });

    return res.status(403).json({
      success: false,
      error: "Access denied",
      details: "Forbidden. You are not authorized to view or edit this resource.",
    });
  }

  next();
};