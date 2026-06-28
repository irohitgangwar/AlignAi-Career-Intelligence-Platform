import { ChatPromptTemplate } from "@langchain/core/prompts";

// yeh system directive har prompt me jaata hai — AI ko grounded rakhta hai.
// Fake claims, fabricated data, aur generic motivational language ko explicitly mana karta hai.
const systemDirectives = `
You are the orchestration brain of AlignAI, an enterprise-grade GenAI resume intelligence platform.

Rules:
- Stay grounded in the provided resume, job description, and retrieved context.
- Do not invent employers, achievements, metrics, certifications, or tools not supported by the inputs.
- Treat retrieved context as memory and evidence, not as permission to fabricate.
- Prefer precise, recruiter-grade language over generic motivational phrasing.
- When evidence is weak, say so clearly.
`.trim();

// yeh main analysis prompt hai — resume vs JD comparison karta hai.
// CRITICAL CHANGE: pehle generic output aata tha jaise "add proficiency level".
// Ab strict rules hain — har gap ke liye JD evidence, resume evidence, interview risk maangta hai.
// Suggestions ab "add more details" nahi, exact bullet rewrites honge.
export const resumeAnalysisPrompt = ChatPromptTemplate.fromMessages([
  ["system", systemDirectives],
  [
    "human",
    `
You are analyzing candidate-job fit for a targeted hiring workflow.
Your analysis must be specific to THIS job description and THIS resume.
Do not give generic resume advice.

Target company:
{companyName}

Target role:
{jobTitle}

Candidate experience summary:
{experienceSummary}

Resume:
{resumeText}

Job description:
{jobDescription}

Retrieved context from the vector knowledge base:
{ragContext}

STRICT RULES FOR YOUR ANALYSIS:

1. VULNERABILITIES — Every gap you identify MUST:
   - Cite the SPECIFIC requirement from the JD that creates this gap (evidenceFromJD)
   - Quote what the resume currently says about it, or "Not mentioned" (evidenceFromResume)
   - Explain why this gap hurts: ATS rejection, interview exposure, or recruiter skip (whyItMatters)
   - Provide an exact resume bullet the candidate can paste IF they have the experience (resumeFix). If they genuinely lack the skill, say "No truthful fix — this is a real skill gap to address through learning."
   - State what an interviewer might ask to expose this gap (interviewRisk)

2. DO NOT flag these as gaps:
   - Missing "proficiency levels" — nobody writes proficiency levels on resumes
   - Missing "specific details" unless the JD explicitly demands them AND their absence would cause rejection
   - Skills the JD lists as "nice to have" unless the candidate has zero mention of them

3. STRONG POINTS — For each strength:
   - Quote the exact evidence from the resume that proves it
   - Explain why it matters for THIS specific JD

4. IMPROVEMENT SUGGESTIONS — Must be exact bullet rewrites:
   - Show the current bullet from the resume (or "Missing — no relevant bullet exists")
   - Show the improved version that is truthful and JD-targeted
   - Explain WHY this change helps for this JD
   - Add a warning if the improvement assumes experience the resume doesn't confirm
   - NEVER say "add more details" or "optimize" or "provide more information" — these are useless

5. RECOMMENDED KEYWORDS:
   - Only keywords that are present in the JD but weak or absent in the resume
   - Only include keywords the candidate could truthfully claim based on their resume

Return structured output that:
1. Scores alignment realistically from 0 to 100.
2. Distinguishes real strengths from claims that are merely adjacent.
3. Identifies the highest-risk capability gaps with full evidence chain.
4. Recommends resume improvements that are exact, truthful bullet rewrites.
5. Suggests ATS keywords present in the JD but missing in the resume.
`,
  ],
]);

// yeh resume rewrite prompt hai — candidate ka resume JD ke hisaab se polish karta hai.
// CRITICAL CHANGE: ab structured sections me output aayega (Summary, Skills, Experience, Projects, Education).
// Fake skills add karne pe pabandi hai — agar koi JD skill missing hai toh [GAP] marker lagega.
export const resumeRewritePrompt = ChatPromptTemplate.fromMessages([
  ["system", systemDirectives],
  [
    "human",
    `
Rewrite the resume for a targeted application while preserving factual truth.

Target company:
{companyName}

Target role:
{jobTitle}

Original resume:
{resumeText}

Job description:
{jobDescription}

Improvement directives:
{improvementSuggestions}

Retrieved context from the vector knowledge base:
{ragContext}

STRICT RULES FOR REWRITE:

1. STRUCTURE — Format your response to exactly match this JSON shape:
{{
  "name": string (candidate's name, from original resume),
  "headline": string (professional headline matching target role, e.g. "Senior React Engineer"),
  "summary": string[] (2-3 tailored summary sentences, each as a list item),
  "skills": string[] (grouped categories or list of technical skills, e.g. ["JavaScript", "React", "Node.js"]),
  "experience": [
    {{
      "role": string,
      "company": string,
      "bullets": string[] (professional, action-oriented bullet points)
    }}
  ],
  "projects": [
    {{
      "title": string,
      "bullets": string[] (bullets showing what was built, tech used, and outcome)
    }}
  ],
  "education": string[] (candidate education degrees and schools)
}}

2. BULLET QUALITY:
   - Start with strong action verbs (Developed, Implemented, Designed, Built, Optimized)
   - Add measurable outcomes WHERE the original resume supports them
   - Show technical depth: mention specific APIs, patterns, architectures used
   - "Built a React app" → "Developed a React dashboard with reusable component architecture, REST API integration, and form validation" — but ONLY if the original mentions React work

3. ATS KEYWORDS:
   - Naturally weave in keywords from the JD for skills the candidate ACTUALLY has
   - Do NOT add keywords for skills not evident in the original resume

4. HONESTY RULES:
   - NEVER add fictional projects, titles, durations, metrics, or tools
   - NEVER invent experience the original resume does not support
   - If a JD requirement is missing from the resume, add this marker into the bullets or summary:
     "[GAP: JD requires \\"requirement\\" but resume has no evidence of this skill]"
   - If experience is thin, improve framing and wording instead of fabricating

Return ONLY the JSON payload. Do not include markdown code block formatting or any extra text.
`,
  ],
]);

// mock interview prompt — technical depth aur resume authenticity dono test karta hai.
// Yeh pehle se mostly theek tha, minor improvements for consistency.
export const mockInterviewPrompt = ChatPromptTemplate.fromMessages([
  ["system", systemDirectives],
  [
    "human",
    `
Generate advanced mock interview questions for this target role.

Target role:
{jobTitle}

Resume:
{resumeText}

Job description:
{jobDescription}

Retrieved context from the vector knowledge base:
{ragContext}

Generate hard, role-aware questions that test both technical depth and resume authenticity.
Focus on:
1. Skills claimed in the resume that the JD requires — test if the candidate truly knows them
2. Gaps between resume and JD — questions that would expose these gaps
3. Project-specific questions — ask about architecture, trade-offs, and scaling of projects mentioned
4. Scenario-based questions — real-world problems the role would face
`,
  ],
]);

// skill plan prompt — gaps ko practical learning roadmap me convert karta hai.
// Yeh bhi pehle se theek tha.
export const skillPlanPrompt = ChatPromptTemplate.fromMessages([
  ["system", systemDirectives],
  [
    "human",
    `
Create a practical skill development plan.

Current experience:
{currentExperience}

Identified vulnerabilities:
{vulnerabilities}

Retrieved context from the vector knowledge base:
{ragContext}

Return a realistic, sequenced plan that prioritizes the highest-impact gaps first.
`,
  ],
]);
