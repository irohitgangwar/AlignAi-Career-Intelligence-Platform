import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Helper to generate a signed JWT token
const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register new candidate profile and returns JWT
 * @access  Public
 */
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 1. Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        details: "Name, email, and password must be provided.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Weak password",
        details: "Password must be at least 6 characters.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "Registration failed",
        details: "A user is already registered with this email address.",
      });
    }

    // 3. Cryptographically hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Create unique userId for references (matches AlignAI legacy style)
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 5. Create user record
    const user = await User.create({
      userId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      currentRole: "Candidate",
      experience: 0,
    });

    // 6. Sign JWT token
    const token = generateToken(userId, normalizedEmail);

    logger.info("New user registered successfully", { userId, email: normalizedEmail });

    // Return token and data (OMIT passwordHash!)
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      data: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        currentRole: user.currentRole,
        experience: user.experience,
      },
    });
  } catch (error) {
    logger.error("Signup handler error", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during registration",
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and returns JWT
 * @access  Public
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Missing credentials",
        details: "Please provide both email and password.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Return a generic error to prevent email harvesting attempts by attackers
      return res.status(401).json({
        success: false,
        error: "Authentication failed",
        details: "Invalid email or password credentials.",
      });
    }

    // 2. Validate password hashes
    if (!user.passwordHash) {
      logger.warn("Attempted login to legacy profile with null password", { userId: user.userId });
      return res.status(401).json({
        success: false,
        error: "Authentication failed",
        details: "This is a legacy profile without a configured password. Please contact support or register a new account.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Authentication failed",
        details: "Invalid email or password credentials.",
      });
    }

    // 3. Sign JWT token
    const token = generateToken(user.userId, normalizedEmail);

    logger.info("User logged in successfully", { userId: user.userId, email: normalizedEmail });

    res.json({
      success: true,
      message: "Login successful",
      token,
      data: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        currentRole: user.currentRole,
        experience: user.experience,
        resumeFileName: user.resumeFileName,
      },
    });
  } catch (error) {
    logger.error("Login handler error", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during login",
      details: error.message,
    });
  }
});

export default router;