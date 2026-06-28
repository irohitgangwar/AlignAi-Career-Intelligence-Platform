// yeh file analysis ke saare API routes define karti hai.
// Express router use karta hai — frontend se HTTP requests aati hain, yeh unhe handle karta hai.
// Har route ek specific GenAI feature ke liye hai:
// 1. /analyze — resume vs JD analysis (main feature)
// 2. /improve-resume — AI se resume rewrite
// 3. /mock-interview — interview questions generate
// 4. /skill-development — learning roadmap generate
// 5. /download-resume-pdf — improved resume ko PDF me convert karke download (NEW)

import express from "express";
import {
  analyzeResumeVsJob,
  generateImprovedResume,
  generateMockInterviewQuestions,
  generateSkillDevelopmentPlan,
} from "../utils/genai.js";
import { upsertKnowledgeChunks } from "../utils/rag.js";
import { generateResumePdf } from "../utils/resumePdfGenerator.js";
import { validateBody } from "../middlewares/validate.js";
import {
  analyzeSchema,
  improveResumeSchema,
  mockInterviewSchema,
  skillDevelopmentSchema,
  downloadPdfSchema,
} from "../schemas/requestSchemas.js";
import { logger } from "../utils/logger.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

// ==========================================
// ROUTE 1: POST /analyze
// ==========================================
router.post("/analyze",protect, validateBody(analyzeSchema), async (req, res) => {
  const userId = req.user.userId;
const { resumeText, jobDescription, companyName, jobTitle } = req.body;

  try {
    logger.info("Starting resume vs JD analysis", { userId, companyName, jobTitle });

    if (userId) {
      await upsertKnowledgeChunks({
        userId,
        sourceType: "job_description",
        sourceId: `${companyName || "company"}-${jobTitle || "role"}`,
        title: `${companyName || "Company"} - ${jobTitle || "Role"} JD`,
        text: jobDescription,
        metadata: {
          companyName,
          jobTitle,
        },
      });
    }

    const analysis = await analyzeResumeVsJob(resumeText, jobDescription, {
      userId,
      companyName,
      jobTitle,
      resumeText,
      jobDescription,
    });

    logger.info("Analysis completed successfully", { userId });

    res.json({
      success: true,
      message: "Analysis completed successfully",
      data: analysis,
    });
  } catch (error) {
    logger.error("Analysis route error", error, { userId });
    res.status(500).json({
      success: false,
      error: "Error during analysis",
      details: error.message,
    });
  }
});

// ==========================================
// ROUTE 2: POST /improve-resume
// ==========================================
router.post("/improve-resume",protect, validateBody(improveResumeSchema), async (req, res) => {
  const userId = req.user.userId;
const { resumeText, jobDescription, companyName, jobTitle } = req.body;

  try {
    logger.info("Starting resume rewrite improvement", { userId, companyName, jobTitle });

    const improvedResume = await generateImprovedResume(
      resumeText,
      jobDescription,
      improvements || [],
      { userId, companyName, jobTitle }
    );

    logger.info("Resume improvement generated successfully", { userId });

    res.json({
      success: true,
      message: "Improved resume generated successfully",
      data: {
        improvedResumeText: improvedResume,
      },
    });
  } catch (error) {
    logger.error("Resume improvement route error", error, { userId });
    res.status(500).json({
      success: false,
      error: "Error improving resume",
      details: error.message,
    });
  }
});

// ==========================================
// ROUTE 3: POST /mock-interview
// ==========================================
router.post("/mock-interview",protect, validateBody(mockInterviewSchema), async (req, res) => {
  const userId = req.user.userId;
const { resumeText, jobDescription, jobTitle } = req.body;

  try {
    logger.info("Generating mock interview questions", { userId, jobTitle });

    const questions = await generateMockInterviewQuestions(
      jobDescription,
      resumeText,
      { userId, jobTitle, resumeText, jobDescription }
    );

    logger.info("Mock interview questions generated successfully", { userId });

    res.json({
      success: true,
      message: "Mock interview questions generated successfully",
      data: questions,
    });
  } catch (error) {
    logger.error("Mock interview route error", error, { userId });
    res.status(500).json({
      success: false,
      error: "Error generating mock interview questions",
      details: error.message,
    });
  }
});

// ==========================================
// ROUTE 4: POST /skill-development
// ==========================================
router.post("/skill-development",protect, validateBody(skillDevelopmentSchema), async (req, res) => {
  const userId = req.user.userId;
const { vulnerabilities, currentExperience } = req.body;

  try {
    logger.info("Generating skill development roadmap", { userId, currentExperience });

    const plan = await generateSkillDevelopmentPlan(
      vulnerabilities,
      currentExperience,
      { userId }
    );

    logger.info("Skill development plan generated successfully", { userId });

    res.json({
      success: true,
      message: "Skill development plan generated successfully",
      data: {
        developmentPlan: plan,
      },
    });
  } catch (error) {
    logger.error("Skill development route error", error, { userId });
    res.status(500).json({
      success: false,
      error: "Error generating skill development plan",
      details: error.message,
    });
  }
});

// ==========================================
// ROUTE 5: POST /download-resume-pdf
// ==========================================
router.post("/download-resume-pdf",protect, validateBody(downloadPdfSchema), async (req, res) => {
 const userId = req.user.userId;
const { improvedResumeText, candidateName } = req.body;

  try {
    logger.info("Generating downloadable PDF resume", { candidateName });

    // PDF generate karo — PDF generator structured JSON aur raw text dono formats support karta hai
    const pdfBuffer = await generateResumePdf(
      improvedResumeText,
      candidateName || ""
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="improved-resume.pdf"',
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    logger.error("PDF generation route error", error, { candidateName });
    res.status(500).json({
      success: false,
      error: "Error generating resume PDF",
      details: error.message,
    });
  }
});

export default router;
