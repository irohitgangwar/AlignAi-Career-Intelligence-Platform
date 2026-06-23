import { invokeTextModel } from "../config/ai.js";
import {
  mockInterviewPrompt,
  resumeAnalysisPrompt,
  resumeRewritePrompt,
  skillPlanPrompt,
} from "../prompts/analysisPrompts.js";
import {
  mockInterviewSchema,
  resumeAnalysisSchema,
} from "../schemas/analysisSchemas.js";
import { formatRagContext, retrieveKnowledge } from "./vectorStore.js";

// Hinglish: yeh JSON shape instructions hain jo AI ko batati hain ki output ka exact format kya hona chahiye.
// CRITICAL CHANGE: pehle shallow schema tha (skill, severity, detail).
// Ab expanded schema hai — har vulnerability me JD evidence, resume evidence, interview risk hai.
// Suggestions ab structured hain with currentBullet → improvedBullet.
// strongPoints me ab evidence aur JD relevance hai.
const analysisJsonInstructions = `
Return only valid JSON with this exact shape:
{
  "matchScore": number from 0 to 100,
  "matchSummary": string (2-3 sentences summarizing overall fit),
  "strongPoints": [
    {
      "point": string (specific strength name),
      "evidenceFromResume": string (exact quote or reference from resume proving this),
      "relevanceToJD": string (why this matters for this specific JD)
    }
  ],
  "vulnerabilities": [
    {
      "skill": string (specific skill or capability gap),
      "severity": "High" | "Medium" | "Low",
      "evidenceFromJD": string (exact requirement from JD creating this gap),
      "evidenceFromResume": string (what resume says, or "Not mentioned"),
      "whyItMatters": string (ATS rejection, interview exposure, or recruiter skip),
      "resumeFix": string (exact bullet to paste, or "No truthful fix — real skill gap"),
      "interviewRisk": string (what interviewer might ask to expose this)
    }
  ],
  "improvementSuggestions": [
    {
      "section": string (resume section like "Projects", "Skills", "Experience"),
      "currentBullet": string (what resume currently says, or "Missing — no relevant bullet"),
      "improvedBullet": string (exact improved version),
      "reason": string (why this helps for this JD),
      "warning": string or null (caveat if improvement assumes unconfirmed experience)
    }
  ],
  "recommendedKeywords": string[]
}
Do not wrap the JSON in markdown.
`.trim();

// Hinglish: interview questions ka JSON shape — yeh pehle se sahi tha, koi change nahi
const interviewJsonInstructions = `
Return only valid JSON with this exact shape:
{
  "questions": [
    {
      "question": string,
      "difficulty": "Medium" | "Hard" | "Advanced",
      "expectedAnswerHints": string[]
    }
  ]
}
Do not wrap the JSON in markdown.
`.trim();

// Hinglish: retrieval query banane ke liye helper — sabhi relevant text ko combine karta hai
// taaki Pinecone se semantically similar chunks mil sakein.
function buildSharedQueryParts(options = {}) {
  return [
    options.companyName || "",
    options.jobTitle || "",
    options.resumeText || "",
    options.jobDescription || "",
    options.extraContext || "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Hinglish: har GenAI call se pehle Pinecone se relevant memory chunks nikaalte hain.
// yeh retrieved context prompt me inject hota hai taaki AI grounded response de sake.
async function getRagChunks(options = {}) {
  return retrieveKnowledge({
    userId: options.userId,
    query: buildSharedQueryParts(options),
    limit: options.limit || 6,
    sourceTypes:
      options.sourceTypes || [
        "resume",
        "job_description",
        "analysis_summary",
        "improved_resume",
      ],
  });
}

// Hinglish: candidate ka compact profile summary banata hai prompt me inject karne ke liye.
// current role aur years of experience jaise fields ko ek line me combine karta hai.
function buildExperienceSummary(options = {}) {
  const parts = [];

  if (options.currentRole) {
    parts.push(`Current role: ${options.currentRole}`);
  }

  if (options.currentExperience !== undefined) {
    parts.push(`Years of experience: ${options.currentExperience}`);
  }

  return parts.join(" | ") || "Not provided";
}

// Hinglish: messages array ke end me JSON format instructions append karta hai.
// yeh AI ko batata hai ki output kis shape me dena hai.
function withJsonInstructions(messages, instructions) {
  return [
    ...messages,
    {
      role: "user",
      content: instructions,
    },
  ];
}

// Hinglish: AI ka raw text response leke usme se JSON object extract karta hai.
// Pehle direct parse try karta hai, fail hone pe first { se last } tak slice karta hai.
// markdown code block wrappers bhi handle karta hai.
function extractJsonObject(text = "") {
  const cleaned = String(text)
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("AI response did not include a JSON object");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

// Hinglish: AI ko call karta hai, JSON instructions append karta hai, response parse karta hai,
// aur Zod schema se validate karta hai. Agar schema match nahi karta toh error throw hota hai.
async function invokeStructuredModel(messages, schema, instructions) {
  const rawOutput = await invokeTextModel(withJsonInstructions(messages, instructions));
  return schema.parse(extractJsonObject(rawOutput));
}

// Hinglish: MAIN ANALYSIS FUNCTION — resume vs JD comparison karta hai.
// Pehle Pinecone se context retrieve karta hai, phir analysis prompt format karta hai,
// phir AI se structured response leke Zod se validate karta hai.
// Output me expanded vulnerabilities, structured suggestions, aur evidence-backed strongPoints hain.
export async function analyzeResumeVsJob(
  resumeText,
  jobDescription,
  options = {}
) {
  // Hinglish: Pinecone se relevant memory chunks nikaalo — resume, JD, past analyses
  const ragChunks = await getRagChunks({
    ...options,
    resumeText,
    jobDescription,
  });

  // Hinglish: prompt template me saari values inject karo
  const prompt = await resumeAnalysisPrompt.formatMessages({
    companyName: options.companyName || "Not provided",
    jobTitle: options.jobTitle || "Not provided",
    experienceSummary: buildExperienceSummary(options),
    resumeText,
    jobDescription,
    ragContext: formatRagContext(ragChunks),
  });

  // Hinglish: AI se structured JSON response lo aur Zod schema se validate karo
  const analysis = await invokeStructuredModel(
    prompt,
    resumeAnalysisSchema,
    analysisJsonInstructions
  );

  // Hinglish: analysis result ke saath RAG metadata bhi return karo — debugging ke liye useful hai
  return {
    ...analysis,
    ragMeta: {
      usedChunks: ragChunks.length,
      retrievedSources: [...new Set(ragChunks.map((chunk) => chunk.metadata?.sourceType))],
    },
  };
}

// Hinglish: RESUME REWRITE FUNCTION — analysis ke suggestions ke basis pe resume improve karta hai.
// Structured sections me output deta hai (Summary, Skills, Experience, Projects, Education).
// Fake claims add nahi karta — [GAP] markers lagata hai jahan genuine skill missing hai.
export async function generateImprovedResume(
  resumeText,
  jobDescription,
  improvementSuggestions,
  options = {}
) {
  // Hinglish: suggestions ko string format me convert karo — agar structured objects hain toh readable banao
  const suggestionsText = (improvementSuggestions || [])
    .map((suggestion) => {
      // Hinglish: agar suggestion ek object hai (new schema), toh readable format me convert karo
      if (typeof suggestion === "object" && suggestion.improvedBullet) {
        return `[${suggestion.section}] Change "${suggestion.currentBullet}" to "${suggestion.improvedBullet}" — Reason: ${suggestion.reason}`;
      }
      // Hinglish: agar purana plain string format hai, toh as-is use karo (backward compatibility)
      return String(suggestion);
    })
    .join("\n");

  // Hinglish: Pinecone se relevant context nikaal rahe hain — suggestions bhi query me daale hain
  const ragChunks = await getRagChunks({
    ...options,
    resumeText,
    jobDescription,
    extraContext: suggestionsText,
    limit: 5,
  });

  // Hinglish: rewrite prompt me saari values inject karo
  const prompt = await resumeRewritePrompt.formatMessages({
    companyName: options.companyName || "Not provided",
    jobTitle: options.jobTitle || "Not provided",
    resumeText,
    jobDescription,
    improvementSuggestions: suggestionsText || "No explicit suggestions provided.",
    ragContext: formatRagContext(ragChunks),
  });

  // Hinglish: yeh plain text return karta hai (resume rewrite ko JSON me nahi chahiye)
  return invokeTextModel(prompt);
}

// Hinglish: MOCK INTERVIEW FUNCTION — JD-specific aur resume-aware interview questions generate karta hai.
// Questions resume ki strengths aur gaps dono ko test karte hain.
export async function generateMockInterviewQuestions(
  jobDescription,
  resumeText,
  options = {}
) {
  // Hinglish: interview context ke liye bhi Pinecone se retrieval kar rahe hain
  const ragChunks = await getRagChunks({
    ...options,
    resumeText,
    jobDescription,
    limit: 5,
  });

  const prompt = await mockInterviewPrompt.formatMessages({
    jobTitle: options.jobTitle || "Target role not provided",
    resumeText,
    jobDescription,
    ragContext: formatRagContext(ragChunks),
  });

  // Hinglish: structured JSON response leke Zod se validate karo
  return invokeStructuredModel(
    prompt,
    mockInterviewSchema,
    interviewJsonInstructions
  );
}

// Hinglish: SKILL DEVELOPMENT PLAN FUNCTION — vulnerabilities ko ordered learning roadmap me convert karta hai.
// Highest-impact gaps pehle aate hain.
export async function generateSkillDevelopmentPlan(
  vulnerabilities,
  currentExperience,
  options = {}
) {
  // Hinglish: past analysis memory reuse kar rahe hain taaki plan consistent rahe
  const ragChunks = await getRagChunks({
    ...options,
    extraContext: JSON.stringify(vulnerabilities || [], null, 2),
    limit: 4,
    sourceTypes: ["analysis_summary", "job_description", "resume", "improved_resume"],
  });

  const prompt = await skillPlanPrompt.formatMessages({
    currentExperience: currentExperience ?? "Not provided",
    vulnerabilities: JSON.stringify(vulnerabilities || [], null, 2),
    ragContext: formatRagContext(ragChunks),
  });

  // Hinglish: plain text roadmap return karta hai
  return invokeTextModel(prompt);
}
