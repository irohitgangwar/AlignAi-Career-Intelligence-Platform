import express from "express";
import {
  createOrUpdateProfile,
  getAnalysesForUser,
  getProfile,
  saveAnalysisForUser,
  saveImprovedResume,
  saveResumeForUser,
} from "../utils/profileStore.js";
import { upsertKnowledgeChunks } from "../utils/rag.js";
import { validateBody } from "../middlewares/validate.js";
import {
  createProfileSchema,
  updateProfileSchema,
  saveResumeSchema,
  saveImprovedResumeSchema,
} from "../schemas/requestSchemas.js";
import { logger } from "../utils/logger.js";
import { protect, verifyOwnership } from "../middlewares/auth.js";

const router = express.Router();

router.post("/create", validateBody(createProfileSchema), async (req, res) => {
  const { userId, name, email, experience, currentRole } = req.body;

  try {
    logger.info("Creating or updating user profile", { userId, email });

    const profile = await createOrUpdateProfile({
      userId,
      name,
      email,
      experience,
      currentRole,
    });

    res.json({
      success: true,
      message: "Profile created successfully",
      data: profile,
    });
  } catch (error) {
    logger.error("Profile creation error", error, { userId });
    res.status(500).json({
      success: false,
      error: "Error creating profile",
      details: error.message,
    });
  }
});

router.get("/:userId", protect, verifyOwnership, async (req, res) => {
  const { userId } = req.params;

  try {
    logger.info("Fetching profile details", { userId });

    const profile = await getProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: "Profile not found",
        details: `User profile with id ${userId} does not exist`,
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error("Error fetching profile", error, { userId });
    res.status(500).json({
      success: false,
      error: "Error fetching profile",
      details: error.message,
    });
  }
});

router.put("/:userId", protect, verifyOwnership, validateBody(updateProfileSchema), async (req, res) => {
  const { userId } = req.params;

  try {
    logger.info("Updating profile details", { userId });

    const existing = await getProfile(userId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Profile not found",
        details: `User profile with id ${userId} does not exist`,
      });
    }

    const profile = await createOrUpdateProfile({
      userId,
      name: req.body.name || existing.name,
      email: req.body.email || existing.email,
      experience: req.body.experience ?? existing.experience,
      currentRole: req.body.currentRole || existing.currentRole,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (error) {
    logger.error("Error updating profile", error, { userId });
    res.status(500).json({
      success: false,
      error: "Error updating profile",
      details: error.message,
    });
  }
});

router.put("/:userId/resume", protect, verifyOwnership, validateBody(saveResumeSchema), async (req, res) => {
  const { userId } = req.params;

  try {
    logger.info("Saving resume details to profile", { userId, fileName: req.body.resumeFileName });

    const result = await saveResumeForUser(userId, {
      resumeText: req.body.resumeText,
      resumeFileUrl: req.body.resumeFileUrl,
      resumePublicId: req.body.resumePublicId,
      resumeFileName: req.body.resumeFileName,
      improvedResumeText: req.body.improvedResumeText,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Profile not found",
        details: `User profile with id ${userId} does not exist`,
      });
    }

    if (req.body.resumeText) {
      await upsertKnowledgeChunks({
        userId,
        sourceType: "resume",
        sourceId: "latest",
        title: req.body.resumeFileName || "Latest Resume",
        text: req.body.resumeText,
        metadata: {
          fileName: req.body.resumeFileName || null,
        },
      });
    }

    res.json({
      success: true,
      message: "Resume saved successfully",
      data: result.profile,
    });
  } catch (error) {
    logger.error("Error saving resume", error, { userId });
    res.status(500).json({
      success: false,
      error: "Error saving resume",
      details: error.message,
    });
  }
});

router.put("/:userId/improved-resume", protect, verifyOwnership, validateBody(saveImprovedResumeSchema), async (req, res) => {
  const { userId } = req.params;
  const { improvedResumeText } = req.body;

  try {
    logger.info("Saving improved resume to profile", { userId });

    const profile = await saveImprovedResume(userId, improvedResumeText);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: "Profile not found",
        details: `User profile with id ${userId} does not exist`,
      });
    }

    await upsertKnowledgeChunks({
      userId,
      sourceType: "improved_resume",
      sourceId: "latest",
      title: "Latest Improved Resume",
      text: typeof improvedResumeText === "object" ? JSON.stringify(improvedResumeText, null, 2) : improvedResumeText,
      metadata: {},
    });

    res.json({
      success: true,
      message: "Improved resume saved successfully",
      data: profile,
    });
  } catch (error) {
    logger.error("Error saving improved resume", error, { userId });
    res.status(500).json({
      success: false,
      error: "Error saving improved resume",
      details: error.message,
    });
  }
});

router.post("/:userId/analysis", protect, verifyOwnership, async (req, res) => {
  const { userId } = req.params;

  try {
    logger.info("Saving analysis history to profile", { userId, companyName: req.body.companyName, jobTitle: req.body.jobTitle });

    const analysis = await saveAnalysisForUser(userId, {
      companyName: req.body.companyName,
      jobTitle: req.body.jobTitle,
      jobDescription: req.body.jobDescription,
      analysisData: req.body.analysisData,
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: "Profile not found",
        details: `User profile with id ${userId} does not exist`,
      });
    }

    await upsertKnowledgeChunks({
      userId,
      sourceType: "analysis_summary",
      sourceId: analysis.id,
      title: `${analysis.companyName} - ${analysis.jobTitle}`,
      text: JSON.stringify(analysis.analysisData, null, 2),
      metadata: {
        companyName: analysis.companyName,
        jobTitle: analysis.jobTitle,
      },
    });

    res.json({
      success: true,
      message: "Analysis saved successfully",
      data: {
        analysisId: analysis.id,
        analysis,
      },
    });
  } catch (error) {
    logger.error("Error saving analysis", error, { userId });
    res.status(500).json({
      success: false,
      error: "Error saving analysis",
      details: error.message,
    });
  }
});

router.get("/:userId/analyses", protect, verifyOwnership, async (req, res) => {
  const { userId } = req.params;

  try {
    logger.info("Fetching analyses history", { userId });

    const analyses = await getAnalysesForUser(userId);

    if (!analyses) {
      return res.status(404).json({
        success: false,
        error: "Profile not found",
        details: `User profile with id ${userId} does not exist`,
      });
    }

    res.json({
      success: true,
      data: {
        total: analyses.length,
        analyses,
      },
    });
  } catch (error) {
    logger.error("Error fetching analyses", error, { userId });
    res.status(500).json({
      success: false,
      error: "Error fetching analyses",
      details: error.message,
    });
  }
});

router.get("/:userId/analysis/:analysisId", protect, verifyOwnership, async (req, res) => {
  const { userId, analysisId } = req.params;

  try {
    logger.info("Fetching specific analysis record", { userId, analysisId });

    const profile = await getProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: "Profile not found",
        details: `User profile with id ${userId} does not exist`,
      });
    }

    const analysis = (profile.analyses || []).find(
      (item) => item.id === analysisId
    );

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: "Analysis not found",
        details: `Analysis record with id ${analysisId} does not exist`,
      });
    }

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error("Error fetching analysis", error, { userId, analysisId });
    res.status(500).json({
      success: false,
      error: "Error fetching analysis",
      details: error.message,
    });
  }
});

export default router;
