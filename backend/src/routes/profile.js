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

const router = express.Router();

router.post("/create", async (req, res) => {
  try {
    const { userId, name, email, experience, currentRole } = req.body;

    if (!userId || !name || !email) {
      return res.status(400).json({
        error: "userId, name, email required",
      });
    }

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
    res.status(500).json({
      error: "Error creating profile",
      details: error.message,
    });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const profile = await getProfile(req.params.userId);

    if (!profile) {
      return res.status(404).json({
        error: "Profile not found",
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching profile",
      details: error.message,
    });
  }
});

router.put("/:userId", async (req, res) => {
  try {
    const existing = await getProfile(req.params.userId);

    if (!existing) {
      return res.status(404).json({
        error: "Profile not found",
      });
    }

    const profile = await createOrUpdateProfile({
      userId: req.params.userId,
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
    res.status(500).json({
      error: "Error updating profile",
      details: error.message,
    });
  }
});

router.put("/:userId/resume", async (req, res) => {
  try {
    const result = await saveResumeForUser(req.params.userId, {
      resumeText: req.body.resumeText,
      resumeFileUrl: req.body.resumeFileUrl,
      resumePublicId: req.body.resumePublicId,
      resumeFileName: req.body.resumeFileName,
      improvedResumeText: req.body.improvedResumeText,
    });

    if (!result) {
      return res.status(404).json({
        error: "Profile not found",
      });
    }

    if (req.body.resumeText) {
      await upsertKnowledgeChunks({
        userId: req.params.userId,
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
    res.status(500).json({
      error: "Error saving resume",
      details: error.message,
    });
  }
});

router.put("/:userId/improved-resume", async (req, res) => {
  try {
    if (!req.body.improvedResumeText) {
      return res.status(400).json({
        error: "Improved resume text is required",
      });
    }

    const profile = await saveImprovedResume(
      req.params.userId,
      req.body.improvedResumeText
    );

    if (!profile) {
      return res.status(404).json({
        error: "Profile not found",
      });
    }

    await upsertKnowledgeChunks({
      userId: req.params.userId,
      sourceType: "improved_resume",
      sourceId: "latest",
      title: "Latest Improved Resume",
      text: req.body.improvedResumeText,
      metadata: {},
    });

    res.json({
      success: true,
      message: "Improved resume saved successfully",
      data: profile,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error saving improved resume",
      details: error.message,
    });
  }
});

router.post("/:userId/analysis", async (req, res) => {
  try {
    const analysis = await saveAnalysisForUser(req.params.userId, {
      companyName: req.body.companyName,
      jobTitle: req.body.jobTitle,
      jobDescription: req.body.jobDescription,
      analysisData: req.body.analysisData,
    });

    if (!analysis) {
      return res.status(404).json({
        error: "Profile not found",
      });
    }

    await upsertKnowledgeChunks({
      userId: req.params.userId,
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
    res.status(500).json({
      error: "Error saving analysis",
      details: error.message,
    });
  }
});

router.get("/:userId/analyses", async (req, res) => {
  try {
    const analyses = await getAnalysesForUser(req.params.userId);

    if (!analyses) {
      return res.status(404).json({
        error: "Profile not found",
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
    res.status(500).json({
      error: "Error fetching analyses",
      details: error.message,
    });
  }
});

router.get("/:userId/analysis/:analysisId", async (req, res) => {
  try {
    const profile = await getProfile(req.params.userId);

    if (!profile) {
      return res.status(404).json({
        error: "Profile not found",
      });
    }

    const analysis = (profile.analyses || []).find(
      (item) => item.id === req.params.analysisId
    );

    if (!analysis) {
      return res.status(404).json({
        error: "Analysis not found",
      });
    }

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching analysis",
      details: error.message,
    });
  }
});

export default router;
