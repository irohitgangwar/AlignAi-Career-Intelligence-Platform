import { z } from "zod";

// Hinglish: pehle sirf skill, severity, detail tha — bahut shallow tha, AI generic advice de raha tha.
// Ab har vulnerability ke liye JD se evidence, resume se evidence, aur interview risk maangenge.

// Hinglish: yeh schema ek single gap/vulnerability ko represent karta hai.
// AI ko har field fill karna padega, toh vague "add proficiency level" wali bakwas nahi aa sakti.
export const vulnerabilitySchema = z.object({
  // Hinglish: skill ka naam — specific hona chahiye, jaise "React Component Architecture" na ki sirf "Frontend"
  skill: z.string(),

  // Hinglish: kitna critical hai yeh gap — High matlab screening me reject, Low matlab nice-to-have
  severity: z.enum(["High", "Medium", "Low"]),

  // Hinglish: JD me exactly kya likha hai jo yeh gap create karta hai
  evidenceFromJD: z.string(),

  // Hinglish: resume me is skill ke baare me kya likha hai, ya "Not mentioned" agar kuch nahi hai
  evidenceFromResume: z.string(),

  // Hinglish: yeh gap kyun matter karta hai — ATS rejection, interview me phasoge, ya recruiter skip karega
  whyItMatters: z.string(),

  // Hinglish: exact resume bullet jo candidate paste kar sake — agar truthful fix possible nahi hai toh clearly bol do
  resumeFix: z.string(),

  // Hinglish: interviewer is gap ko expose karne ke liye kya pooch sakta hai
  interviewRisk: z.string(),
});

// Hinglish: pehle suggestions sirf string array thi — "add more details" jaisi bakwas aati thi.
// Ab har suggestion me current bullet, improved bullet, reason, aur warning hogi.
export const suggestionSchema = z.object({
  // Hinglish: resume ka kaun sa section — jaise "Projects", "Skills", "Experience"
  section: z.string(),

  // Hinglish: resume me abhi kya likha hai (ya "Missing" agar koi relevant bullet nahi hai)
  currentBullet: z.string(),

  // Hinglish: improved version jo candidate directly use kar sake
  improvedBullet: z.string(),

  // Hinglish: yeh change is JD ke liye kyun zaroori hai
  reason: z.string(),

  // Hinglish: agar improvement assume karta hai koi experience jo resume me confirm nahi hai, toh warning do
  // null agar koi caveat nahi hai
  warning: z.string().nullable(),
});

// Hinglish: pehle strongPoints sirf string array thi — "good at React" jaisa generic aata tha.
// Ab har strength ke saath resume se proof aur JD se relevance dikhana padega.
export const strongPointSchema = z.object({
  // Hinglish: strength ka naam — specific hona chahiye
  point: z.string(),

  // Hinglish: resume me exactly kya likha hai jo yeh strength prove karta hai
  evidenceFromResume: z.string(),

  // Hinglish: is JD ke liye yeh strength kyun relevant hai
  relevanceToJD: z.string(),
});

// Hinglish: yeh main analysis schema hai — poora resume-vs-JD analysis ka output is shape me aayega.
// har field structured hai taaki AI generic advice na de sake.
export const resumeAnalysisSchema = z.object({
  // Hinglish: 0-100 score — kitna match hai candidate JD ke saath
  matchScore: z.number().min(0).max(100),

  // Hinglish: ek paragraph summary — overall fit ka assessment
  matchSummary: z.string(),

  // Hinglish: strengths with proof — har ek ke saath resume evidence aur JD relevance
  strongPoints: z.array(strongPointSchema).min(1),

  // Hinglish: gaps with full evidence chain — JD requirement, resume gap, fix, interview risk
  vulnerabilities: z.array(vulnerabilitySchema).min(1),

  // Hinglish: actionable suggestions — exact bullet rewrites, not "add more details"
  improvementSuggestions: z.array(suggestionSchema).min(1),

  // Hinglish: ATS keywords jo JD me hain lekin resume me weak ya absent hain
  recommendedKeywords: z.array(z.string()).min(1),
});

// Hinglish: mock interview schema — yeh pehle se theek tha, koi change nahi
export const mockInterviewSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      difficulty: z.enum(["Medium", "Hard", "Advanced"]),
      expectedAnswerHints: z.array(z.string()).min(2),
    })
  ),
});
