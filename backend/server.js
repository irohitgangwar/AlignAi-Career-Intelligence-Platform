// dotenv ko sabse pehle load kar rahe hain taki imported files ko bhi .env values mil jayein.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { PDFParse } from "pdf-parse";
import { connectDB } from "./src/config/db.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  isCloudinaryConfigured,
} from "./src/utils/cloudinary.js";
import upload from "./src/middlewares/multer.js";
import analysisRouter from "./src/routes/analysis.js";
import profileRouter from "./src/routes/profile.js";
import authRouter from "./src/routes/auth.js";
import { protect } from "./src/middlewares/auth.js";
import {
  createOrUpdateProfile,
  getProfile,
  saveResumeForUser,
} from "./src/utils/profileStore.js";
import { upsertKnowledgeChunks } from "./src/utils/rag.js";
import { logger } from "./src/utils/logger.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/profile", profileRouter);

app.post("/api/upload", protect, upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file provided",
      details: "Please upload a resume file",
    });
  }

  try {
    const userId = req.user.userId;
    const { name, email, currentRole, experience } = req.body;
    let extractedText = "";

    logger.info("PDF upload request received", {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      userId,
    });

    try {
      // pdf-parse v2 me parser object banana padta hai, direct function call nahi hoti.
      const parser = new PDFParse({ data: req.file.buffer });
      const pdfData = await parser.getText();
      extractedText = (pdfData.text || "").trim();
      await parser.destroy();
    } catch (parseError) {
      logger.error("PDF text extraction failed", parseError, { fileName: req.file.originalname });
      return res.status(400).json({
        success: false,
        error: "Could not read text from this PDF",
        details: "Please upload a text-based PDF resume. Scanned or protected PDFs may fail.",
      });
    }

    if (!extractedText) {
      return res.status(400).json({
        success: false,
        error: "This PDF does not contain readable text",
        details: "Please upload a normal text resume PDF instead of an image-only or empty PDF.",
      });
    }

    const oldProfile = userId ? await getProfile(userId) : null;
    let cloudinaryResponse = null;

    // storage fail ho jaye tab bhi analysis ke liye upload route ko band nahi karna.
    if (isCloudinaryConfigured()) {
      try {
        cloudinaryResponse = await uploadBufferToCloudinary(
          req.file.buffer,
          req.file.originalname
        );
      } catch (storageError) {
        logger.warn("Cloudinary upload skipped", { message: storageError.message });
      }
    }

    let savedProfile = null;

    if (userId) {
      // agar user pehli baar aaya hai to yahin profile create/update kar do.
      await createOrUpdateProfile({
        userId,
        name: name || oldProfile?.name || "Demo User",
        email: email || oldProfile?.email || `${userId}@alignai.local`,
        currentRole: currentRole || oldProfile?.currentRole || "Fresher",
        experience: experience ? Number(experience) : (oldProfile?.experience ?? 0),
      });

      const savedResume = await saveResumeForUser(userId, {
        resumeText: extractedText,
        resumeFileUrl: cloudinaryResponse?.secure_url || null,
        resumePublicId: cloudinaryResponse?.public_id || null,
        resumeFileName: req.file.originalname,
      });

      savedProfile = savedResume?.profile || null;

      await upsertKnowledgeChunks({
        userId,
        sourceType: "resume",
        sourceId: "latest",
        title: req.file.originalname,
        text: extractedText,
        metadata: {
          fileName: req.file.originalname,
        },
      });

      // naya resume aate hi purana Cloudinary file hata do, warna storage fill hota rahega.
      if (cloudinaryResponse?.public_id && savedResume?.previousResume?.publicId) {
        await deleteFromCloudinary(savedResume.previousResume.publicId);
      }
    }

    logger.info("PDF upload and processing succeeded", { fileName: req.file.originalname, userId });

    res.json({
      success: true,
      message: "File uploaded successfully",
      fileUrl: cloudinaryResponse?.secure_url || null,
      publicId: cloudinaryResponse?.public_id || null,
      resumeText: extractedText,
      fileName: req.file.originalname,
      profile: savedProfile,
      storageWarning: cloudinaryResponse
        ? null
        : "Resume text was processed, but cloud storage was skipped",
    });
  } catch (error) {
    logger.error("Upload error", error);
    res.status(500).json({
      success: false,
      error: "Server error during file processing",
      details: error.message,
    });
  }
});

app.use((error, req, res, next) => {
  if (error?.name === "MulterError") {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File is too large",
        details: "Please upload a PDF smaller than 2MB.",
      });
    }
  }

  if (error) {
    logger.error("Global file upload handler caught error", error);
    return res.status(400).json({
      success: false,
      error: "File upload failed",
      details: error.message,
    });
  }

  next();
});

app.get("/handshake", (req, res) => {
  res.json({
    success: true,
    message: "AlignAI GenAI server is running",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "AlignAI GenAI API Server is live",
    version: "2.0.0",
    endpoints: {
      upload: "POST /api/upload",
      analyze: "POST /api/analysis/analyze",
      improveResume: "POST /api/analysis/improve-resume",
      mockInterview: "POST /api/analysis/mock-interview",
      skillDevelopment: "POST /api/analysis/skill-development",
      createProfile: "POST /api/profile/create",
      getProfile: "GET /api/profile/:userId",
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    details: `Path ${req.path} with method ${req.method} does not exist`,
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`AlignAI server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  logger.error("Server startup error", error);
  process.exit(1);
});
