import { z } from "zod";

// Schema for Profile Creation
export const createProfileSchema = z.object({
  userId: z.string().min(1, "UserId is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  experience: z.number().nonnegative().optional().default(0),
  currentRole: z.string().optional().default("Fresher"),
});

// Schema for Profile Update
export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email format").optional(),
  experience: z.number().nonnegative().optional(),
  currentRole: z.string().optional(),
});

// Schema for Resume Save
export const saveResumeSchema = z.object({
  resumeText: z.string().min(1, "Resume text is required").optional(),
  resumeFileUrl: z.string().url("Invalid file URL").nullable().optional(),
  resumePublicId: z.string().nullable().optional(),
  resumeFileName: z.string().optional(),
  improvedResumeText: z.string().optional(),
});

// Schema for /api/analysis/analyze
export const analyzeSchema = z.object({
  resumeText: z.string().min(1, "Resume text is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  userId: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
});

// Schema for /api/analysis/improve-resume
export const improveResumeSchema = z.object({
  resumeText: z.string().min(1, "Resume text is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  improvements: z.array(
    z.object({
      section: z.string(),
      currentBullet: z.string(),
      improvedBullet: z.string(),
      reason: z.string(),
      warning: z.string().nullable(),
    })
  ).optional().default([]),
  userId: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
});

// Schema for /api/analysis/mock-interview
export const mockInterviewSchema = z.object({
  resumeText: z.string().min(1, "Resume text is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  userId: z.string().optional(),
  jobTitle: z.string().optional(),
});

// Schema for /api/analysis/skill-development
export const skillDevelopmentSchema = z.object({
  vulnerabilities: z.array(
    z.object({
      skill: z.string(),
      severity: z.enum(["High", "Medium", "Low"]),
      evidenceFromJD: z.string(),
      evidenceFromResume: z.string(),
      whyItMatters: z.string(),
      resumeFix: z.string(),
      interviewRisk: z.string(),
    })
  ).min(1, "At least one vulnerability is required"),
  currentExperience: z.number().nonnegative("Experience must be a non-negative number").optional().default(0),
  userId: z.string().optional(),
});

// Schema for /api/analysis/download-resume-pdf
export const downloadPdfSchema = z.object({
  improvedResumeText: z.union([z.string(), z.record(z.any())]),
  candidateName: z.string().optional(),
});

// Schema for save improved resume
export const saveImprovedResumeSchema = z.object({
  improvedResumeText: z.union([z.string(), z.record(z.any())]),
});
