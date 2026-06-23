import User from "../models/User.js";

function normalizeUser(doc) {
  if (!doc) {
    return null;
  }

  const user = doc.toObject ? doc.toObject() : doc;

  return {
    ...user,
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
    updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt,
    resumeHistory: (user.resumeHistory || []).map((item) => ({
      ...item,
      updatedAt: item.updatedAt?.toISOString?.() || item.updatedAt,
    })),
    analyses: (user.analyses || []).map((item) => ({
      ...item,
      createdAt: item.createdAt?.toISOString?.() || item.createdAt,
    })),
  };
}

function buildProfile(input) {
  return {
    userId: input.userId,
    name: input.name || "User",
    email: input.email || `${input.userId}@alignai.local`,
    experience: input.experience || 0,
    currentRole: input.currentRole || "Fresher",
    resumeText: null,
    resumeFileUrl: null,
    resumePublicId: null,
    resumeFileName: null,
    resumeHistory: [],
    analyses: [],
    improvedResumeText: "",
  };
}

export async function createOrUpdateProfile(input) {
  let user = await User.findOne({ userId: input.userId });

  if (!user) {
    user = await User.create(buildProfile(input));
    return normalizeUser(user);
  }

  // Hinglish: jo fields nayi aayi hain sirf unhi ko update karna hai.
  user.name = input.name || user.name;
  user.email = input.email || user.email;
  user.experience = input.experience ?? user.experience;
  user.currentRole = input.currentRole || user.currentRole;
  await user.save();

  return normalizeUser(user);
}

export async function getProfile(userId) {
  const user = await User.findOne({ userId });
  return normalizeUser(user);
}

export async function saveResumeForUser(userId, resumePayload) {
  const user = await User.findOne({ userId });

  if (!user) {
    return null;
  }

  const previousResume = user.resumeFileUrl
    ? {
        fileUrl: user.resumeFileUrl,
        fileName: user.resumeFileName,
        publicId: user.resumePublicId,
        updatedAt: user.updatedAt,
      }
    : null;

  if (previousResume) {
    user.resumeHistory.unshift(previousResume);
  }

  user.resumeText = resumePayload.resumeText;
  user.resumeFileUrl = resumePayload.resumeFileUrl ?? user.resumeFileUrl;
  user.resumePublicId = resumePayload.resumePublicId ?? user.resumePublicId;
  user.resumeFileName = resumePayload.resumeFileName ?? user.resumeFileName;
  user.improvedResumeText =
    resumePayload.improvedResumeText ?? user.improvedResumeText;

  await user.save();

  return {
    profile: normalizeUser(user),
    previousResume: previousResume
      ? {
          ...previousResume,
          updatedAt:
            previousResume.updatedAt?.toISOString?.() || previousResume.updatedAt,
        }
      : null,
  };
}

export async function saveImprovedResume(userId, improvedResumeText) {
  const user = await User.findOne({ userId });

  if (!user) {
    return null;
  }

  user.improvedResumeText = improvedResumeText;
  await user.save();
  return normalizeUser(user);
}

export async function saveAnalysisForUser(userId, payload) {
  const user = await User.findOne({ userId });

  if (!user) {
    return null;
  }

  const analysis = {
    id: `analysis_${Date.now()}`,
    companyName: payload.companyName || "Unknown Company",
    jobTitle: payload.jobTitle || "Unknown Role",
    jobDescription: payload.jobDescription || "",
    analysisData: payload.analysisData || {},
    createdAt: new Date(),
    status: "completed",
  };

  user.analyses.unshift(analysis);
  await user.save();

  return {
    ...analysis,
    createdAt: analysis.createdAt.toISOString(),
  };
}

export async function getAnalysesForUser(userId) {
  const user = await User.findOne({ userId });

  if (!user) {
    return null;
  }

  return normalizeUser(user).analyses || [];
}
