// Hinglish: yeh file analysis ke saare API routes define karti hai.
// Express router use karta hai — frontend se HTTP requests aati hain, yeh unhe handle karta hai.
// Har route ek specific GenAI feature ke liye hai:
// 1. /analyze — resume vs JD analysis (main feature)
// 2. /improve-resume — AI se resume rewrite
// 3. /mock-interview — interview questions generate
// 4. /skill-development — learning roadmap generate
// 5. /download-resume-pdf — improved resume ko PDF me convert karke download (NEW)

import express from "express";

// Hinglish: GenAI utility functions import — yeh actual AI calls karte hain (HF API → prompt → response)
import {
  analyzeResumeVsJob,       // Hinglish: resume vs JD comparison — main analysis function
  generateImprovedResume,    // Hinglish: resume ko JD ke hisaab se rewrite karta hai
  generateMockInterviewQuestions, // Hinglish: role-specific interview questions generate karta hai
  generateSkillDevelopmentPlan,   // Hinglish: gaps ke liye learning roadmap banata hai
} from "../utils/genai.js";

// Hinglish: RAG utility — Pinecone me text chunks store karta hai (vector embeddings ke saath)
// Jab user JD paste karta hai, toh uske chunks Pinecone me index hote hain.
// Baad me analysis ke waqt relevant chunks retrieve hote hain (semantic search).
import { upsertKnowledgeChunks } from "../utils/rag.js";

// Hinglish: PDF generator import — improved resume text ko downloadable PDF me convert karne ke liye.
// pdfkit use karta hai — lightweight, no browser dependency, Windows pe bhi kaam karta hai.
import { generateResumePdf } from "../utils/resumePdfGenerator.js";

// Hinglish: Express router banao — isse main app me /api/analysis ke under mount karenge
const router = express.Router();

// ==========================================
// ROUTE 1: POST /analyze
// ==========================================
// Hinglish: MAIN ANALYSIS ROUTE — resume vs JD comparison karta hai.
// Frontend se resumeText aur jobDescription aati hai.
// Backend pehle JD ko Pinecone me index karta hai (future retrieval ke liye),
// phir AI se analysis karwata hai (expanded schema — gaps with evidence, structured suggestions, etc.)
// Response me pura analysis JSON aata hai jo dashboard pe render hota hai.
router.post("/analyze", async (req, res) => {
  try {
    // Hinglish: request body se saari values nikaal lo
    const { resumeText, jobDescription, userId, companyName, jobTitle } = req.body;

    // Hinglish: validation — bina resume aur JD ke analysis nahi ho sakti
    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        error: "Both resume text and job description are required",
      });
    }

    // Hinglish: agar userId hai toh JD ko Pinecone me index karo.
    // Kyun: future analyses me yeh JD context ke taur pe retrieve hoga (RAG pattern).
    // Isse AI ko zyada grounded context milta hai.
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

    // Hinglish: AI se analysis karwao — yeh function internally:
    // 1. Pinecone se relevant context retrieve karta hai
    // 2. Analysis prompt format karta hai (strict rules — no vague advice)
    // 3. HF API ko call karta hai
    // 4. Response ko Zod schema se validate karta hai
    // 5. Expanded analysis return karta hai (evidence-backed gaps, structured suggestions, etc.)
    const analysis = await analyzeResumeVsJob(resumeText, jobDescription, {
      userId,
      companyName,
      jobTitle,
      resumeText,
      jobDescription,
    });

    // Hinglish: success response — frontend isko parse karke dashboard pe render karega
    res.json({
      success: true,
      message: "Analysis completed successfully",
      data: analysis,
    });
  } catch (error) {
    // Hinglish: error log — debugging ke liye console pe print karo, lekin full resume text nahi
    console.error("Analysis error:", error);
    res.status(500).json({
      error: "Error during analysis",
      details: error.message,
    });
  }
});

// ==========================================
// ROUTE 2: POST /improve-resume
// ==========================================
// Hinglish: RESUME IMPROVEMENT ROUTE — AI se resume rewrite karwata hai.
// Analysis se jo suggestions aaye (structured — currentBullet → improvedBullet),
// unke basis pe resume ko JD-targeted version me convert karta hai.
// Output plain text hai (structured sections — Summary, Skills, Experience, Projects, Education).
// [GAP] markers lagata hai jahan genuinely missing skills hain (fake nahi add karta).
router.post("/improve-resume", async (req, res) => {
  try {
    // Hinglish: request body se values nikaal lo — improvements ab structured objects hain (new schema)
    const { resumeText, jobDescription, improvements, userId, companyName, jobTitle } = req.body;

    // Hinglish: validation — resume aur JD dono chahiye rewrite ke liye
    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        error: "Resume text and job description are required",
      });
    }

    // Hinglish: AI se improved resume generate karo.
    // improvements array me structured suggestions hain (section, currentBullet, improvedBullet, etc.)
    // genai.js me yeh objects ko readable text me convert hote hain prompt ke liye.
    const improvedResume = await generateImprovedResume(
      resumeText,
      jobDescription,
      improvements || [],
      { userId, companyName, jobTitle }
    );

    // Hinglish: improved resume text return karo — frontend isko textarea me dikhayega
    // aur PDF download button bhi offer karega
    res.json({
      success: true,
      message: "Improved resume generated successfully",
      data: {
        improvedResumeText: improvedResume,
      },
    });
  } catch (error) {
    console.error("Resume improvement error:", error);
    res.status(500).json({
      error: "Error improving resume",
      details: error.message,
    });
  }
});

// ==========================================
// ROUTE 3: POST /mock-interview
// ==========================================
// Hinglish: MOCK INTERVIEW ROUTE — JD-specific aur resume-aware interview questions generate karta hai.
// Questions resume ki claims test karte hain + JD ke requirements pe focus karte hain.
// Response structured hai — har question ke saath difficulty level aur expected answer hints hain.
router.post("/mock-interview", async (req, res) => {
  try {
    const { resumeText, jobDescription, userId, jobTitle } = req.body;

    // Hinglish: validation — bina resume/JD ke relevant questions nahi ban sakte
    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        error: "Both resume text and job description are required",
      });
    }

    // Hinglish: AI se interview questions generate karo.
    // Internally Pinecone se context retrieve karta hai, phir mock interview prompt use karta hai.
    // Output Zod schema se validate hota hai — har question me difficulty aur hints hain.
    const questions = await generateMockInterviewQuestions(
      jobDescription,
      resumeText,
      { userId, jobTitle, resumeText, jobDescription }
    );

    // Hinglish: structured questions return karo — frontend isko interview prep section me dikhayega
    res.json({
      success: true,
      message: "Mock interview questions generated successfully",
      data: questions,
    });
  } catch (error) {
    console.error("Mock interview error:", error);
    res.status(500).json({
      error: "Error generating mock interview questions",
      details: error.message,
    });
  }
});

// ==========================================
// ROUTE 4: POST /skill-development
// ==========================================
// Hinglish: SKILL DEVELOPMENT ROUTE — analysis se identified gaps ko learning roadmap me convert karta hai.
// Input: vulnerabilities array (gaps) + currentExperience (years).
// Output: prioritized learning plan — highest-impact gaps pehle.
router.post("/skill-development", async (req, res) => {
  try {
    const { vulnerabilities, currentExperience, userId } = req.body;

    // Hinglish: validation — bina gaps ke learning plan nahi ban sakta
    if (!vulnerabilities || currentExperience === undefined) {
      return res.status(400).json({
        error: "Vulnerabilities and current experience are required",
      });
    }

    // Hinglish: AI se skill development plan generate karo.
    // Pinecone se past analysis context retrieve karta hai taaki plan consistent rahe.
    const plan = await generateSkillDevelopmentPlan(
      vulnerabilities,
      currentExperience,
      { userId }
    );

    // Hinglish: plain text roadmap return karo
    res.json({
      success: true,
      message: "Skill development plan generated successfully",
      data: {
        developmentPlan: plan,
      },
    });
  } catch (error) {
    console.error("Skill development error:", error);
    res.status(500).json({
      error: "Error generating skill development plan",
      details: error.message,
    });
  }
});

// ==========================================
// ROUTE 5: POST /download-resume-pdf (NEW)
// ==========================================
// Hinglish: PDF DOWNLOAD ROUTE — improved resume text ko PDF me convert karke browser me download bhejta hai.
// Kaam kaise karta hai:
// 1. Frontend se improvedResumeText aur optional candidateName aata hai (POST body me)
// 2. resumePdfGenerator.js se PDF Buffer generate hota hai (pdfkit use karke)
// 3. Response me PDF file bhejte hain with proper headers
// 4. Browser automatically download prompt dikhata hai
//
// IMPORTANT: yeh route koi AI call NAHI karta — sirf text-to-PDF conversion hai.
// Isliye response fast hai (milliseconds, not seconds like AI routes).
router.post("/download-resume-pdf", async (req, res) => {
  try {
    const { improvedResumeText, candidateName } = req.body;

    // Hinglish: validation — bina resume text ke PDF nahi bana sakte
    if (!improvedResumeText || !improvedResumeText.trim()) {
      return res.status(400).json({
        error: "Improved resume text is required to generate PDF",
      });
    }

    // Hinglish: PDF generate karo — yeh Buffer return karta hai (binary data).
    // Buffer matlab raw bytes — PDF file ka content in-memory.
    // Disk pe save nahi karta, directly memory se response me bhej deta hai.
    const pdfBuffer = await generateResumePdf(
      improvedResumeText,
      candidateName || ""
    );

    // Hinglish: HTTP response headers set karo — browser ko batao ki yeh PDF file hai:
    // Content-Type: application/pdf → browser PDF ke taur pe treat karega
    // Content-Disposition: attachment → browser download prompt dikhayega (open nahi karega inline)
    // Content-Length: file size in bytes → browser ko pata rahega download kitna bada hai
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="improved-resume.pdf"',
      "Content-Length": pdfBuffer.length,
    });

    // Hinglish: PDF buffer directly response me bhej do — browser download shuru kar dega
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({
      error: "Error generating resume PDF",
      details: error.message,
    });
  }
});

// Hinglish: router export karo — server.js me yeh /api/analysis ke under mount hoga.
// Matlab /analyze actually /api/analysis/analyze banega, etc.
export default router;
