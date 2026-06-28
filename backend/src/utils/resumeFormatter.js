/**
 * Converts a structured JSON resume object into a standard formatted plain-text block.
 * Centered as a Single Source of Truth to prevent logic duplication.
 * 
 * @param {Object|String} resume - The structured JSON resume or plain text
 * @returns {String} Formatted resume text block
 */
export const formatResumeToString = (resume) => {
  if (!resume) return "";
  if (typeof resume === "string") return resume;
  
  let text = "";
  if (resume.name) text += `${resume.name.toUpperCase()}\n`;
  if (resume.headline) text += `${resume.headline}\n\n`;
  
  // Summary Section
  if (Array.isArray(resume.summary) && resume.summary.length) {
    text += "SUMMARY\n";
    resume.summary.forEach(s => text += `- ${s}\n`);
    text += "\n";
  }
  
  // Skills Section
  if (Array.isArray(resume.skills) && resume.skills.length) {
    text += "SKILLS\n";
    text += resume.skills.join("  |  ") + "\n\n";
  }
  
  // Work Experience Section
  if (Array.isArray(resume.experience) && resume.experience.length) {
    text += "EXPERIENCE\n";
    resume.experience.forEach(exp => {
      text += `${exp.role} - ${exp.company}\n`;
      if (Array.isArray(exp.bullets) && exp.bullets.length) {
        exp.bullets.forEach(b => text += `  - ${b}\n`);
      }
      text += "\n";
    });
  }

  // Projects Section
  if (Array.isArray(resume.projects) && resume.projects.length) {
    text += "PROJECTS\n";
    resume.projects.forEach(p => {
      text += `${p.title}\n`;
      if (Array.isArray(p.bullets) && p.bullets.length) {
        p.bullets.forEach(b => text += `  - ${b}\n`);
      }
      text += "\n";
    });
  }

  // Education Section
  if (Array.isArray(resume.education) && resume.education.length) {
    text += "EDUCATION\n";
    resume.education.forEach(edu => text += `- ${edu}\n`);
  }
  
  return text.trim();
};
