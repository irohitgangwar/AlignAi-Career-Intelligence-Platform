import PDFDocument from "pdfkit";

// yeh utility improved resume text ko professionally formatted PDF me convert karti hai.
// pdfkit use karti hai — simple, no browser dependency, Windows pe bhi kaam karta hai.
// Output ATS-friendly hai — clean single-column layout, no fancy graphics.

// PDF ke layout constants — margins, font sizes, line heights sab yahan define hain.
// Ek jagah change karo, poore PDF me consistent rahega.
const LAYOUT = {
  margin: 50,
  pageWidth: 612, // US Letter width in points
  contentWidth: 612 - 50 * 2, // pageWidth minus left+right margins
  fonts: {
    heading: "Helvetica-Bold",
    subheading: "Helvetica-Bold",
    body: "Helvetica",
    bodyItalic: "Helvetica-Oblique",
  },
  sizes: {
    name: 22,
    sectionHeading: 13,
    body: 10.5,
    small: 9,
  },
  colors: {
    black: "#1a1a1a",
    darkGray: "#333333",
    mediumGray: "#555555",
    lightGray: "#888888",
    sectionLine: "#2563eb", // indigo-ish line under section headings
    gapMarker: "#dc2626", // red for [GAP] markers
  },
};

// resume text ko sections me parse karta hai.
// Sections jaise SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION ko identify karta hai.
// Agar koi standard section nahi milta toh pura text "Content" section me daal deta hai.
function parseResumeIntoSections(resumeText) {
  // common section headers ko match karne ke liye regex — case insensitive.
  // "SUMMARY", "## Skills", "EXPERIENCE:", etc. sab match hote hain.
  const sectionPattern =
    /^(?:#{1,3}\s*)?(?:\*{1,2})?\s*(SUMMARY|PROFESSIONAL\s+SUMMARY|OBJECTIVE|SKILLS|TECHNICAL\s+SKILLS|CORE\s+SKILLS|EXPERIENCE|WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|PROJECTS|KEY\s+PROJECTS|EDUCATION|CERTIFICATIONS?|ACHIEVEMENTS?|AWARDS?|PUBLICATIONS?|LANGUAGES?|INTERESTS?|HOBBIES|VOLUNTEER|REFERENCES?)\s*(?:\*{1,2})?:?\s*$/i;

  const lines = resumeText.split("\n");
  const sections = [];
  let currentSection = null;
  let contentLines = [];

  // line by line parse karo — jab naya section header mile toh purana save karo aur naya shuru karo
  for (const line of lines) {
    const match = line.trim().match(sectionPattern);

    if (match) {
      // pichle section ko save karo agar kuch content hai
      if (currentSection !== null) {
        sections.push({
          title: currentSection,
          content: contentLines.join("\n").trim(),
        });
      }

      currentSection = match[1].toUpperCase().trim();
      contentLines = [];
    } else {
      contentLines.push(line);
    }
  }

  // last section ko bhi save karo
  if (currentSection !== null) {
    sections.push({
      title: currentSection,
      content: contentLines.join("\n").trim(),
    });
  }

  // agar koi standard section nahi mila toh pura text ek "CONTENT" section me daal do.
  // yeh fallback hai — kabhi kabhi AI non-standard format me response deta hai.
  if (sections.length === 0) {
    sections.push({
      title: "CONTENT",
      content: resumeText.trim(),
    });
  }

  return sections;
}

// section ka title clean aur readable banata hai.
// "TECHNICAL SKILLS" → "Technical Skills", "WORK EXPERIENCE" → "Work Experience"
function formatSectionTitle(rawTitle) {
  return rawTitle
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// bullet points aur list items ko parse karta hai.
// "- Built React app" ya "• Developed API" ko detect karta hai.
// [GAP: ...] markers ko bhi alag se handle karta hai taaki red me dikhein.
function parseContentLines(content) {
  if (!content) return [];

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // bullet point strip karo — dash, asterisk, dot sab hata do
      const bulletStripped = line.replace(/^[-•*▪▸►]\s*/, "").trim();

      // [GAP: ...] marker detect karo — yeh red me render hoga PDF me
      const isGap = /^\[GAP:/i.test(bulletStripped);

      return {
        text: bulletStripped,
        isBullet: line !== bulletStripped || /^[-•*▪▸►]/.test(line),
        isGap,
      };
    });
}

// MAIN FUNCTION — improved resume text leke PDF Buffer return karta hai.
// candidateName optional hai — agar diya toh PDF ke top pe naam likhega.
// Returns: Promise<Buffer> — yeh buffer directly HTTP response me bhej sakte hain.
export function generateResumePdf(improvedResumeText, candidateName = "") {
  return new Promise((resolve, reject) => {
    try {
      // check karo input key type kya hai. Agar string hai jo JSON form me lagti hai, to parse kar lo.
      let resumeData = null;
      if (typeof improvedResumeText === "object" && improvedResumeText !== null) {
        resumeData = improvedResumeText;
      } else if (typeof improvedResumeText === "string") {
        const trimmed = improvedResumeText.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          try {
            resumeData = JSON.parse(trimmed);
          } catch (e) {
            // treat as normal string
          }
        }
      }

      // naya PDF document banao — US Letter size, auto pages enabled
      const doc = new PDFDocument({
        size: "LETTER",
        margins: {
          top: LAYOUT.margin,
          bottom: LAYOUT.margin,
          left: LAYOUT.margin,
          right: LAYOUT.margin,
        },
        info: {
          Title: candidateName
            ? `${candidateName} - Resume`
            : "Improved Resume",
          Author: "AlignAI",
          Subject: "AI-Improved Resume",
          Creator: "AlignAI Resume Intelligence Platform",
        },
        // bufferPages true se pehle saare pages memory me banenge, phir ek saath flush hoge
        bufferPages: true,
      });

      // PDF output ko chunks me collect karo — end pe Buffer.concat se final buffer banao
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (error) => reject(error));

      // Name aur Headline ko draw karo
      const displayName = resumeData?.name || candidateName || "Candidate";
      if (displayName && displayName !== "User" && displayName !== "Candidate") {
        doc
          .font(LAYOUT.fonts.heading)
          .fontSize(LAYOUT.sizes.name)
          .fillColor(LAYOUT.colors.black)
          .text(displayName, { align: "center" });

        doc.moveDown(0.2);
      }

      if (resumeData?.headline) {
        doc
          .font(LAYOUT.fonts.bodyItalic)
          .fontSize(11)
          .fillColor(LAYOUT.colors.mediumGray)
          .text(resumeData.headline, { align: "center" });

        doc.moveDown(0.8);
      } else if (candidateName) {
        doc.moveDown(0.6);
      }

      // Agar structured resume JSON load ho gaya, to clean object rendering apply karo
      if (resumeData) {
        const renderBullet = (text) => {
          if (doc.y + 20 > doc.page.height - LAYOUT.margin) {
            doc.addPage();
          }

          const isGap = /^\[GAP:/i.test(text.trim());
          if (isGap) {
            doc
              .font(LAYOUT.fonts.bodyItalic)
              .fontSize(LAYOUT.sizes.small)
              .fillColor(LAYOUT.colors.gapMarker)
              .text(text.trim(), LAYOUT.margin + 15, doc.y, {
                width: LAYOUT.contentWidth - 15,
                lineGap: 3,
              });
          } else {
            const bulletX = LAYOUT.margin + 10;
            const textX = LAYOUT.margin + 22;

            doc
              .font(LAYOUT.fonts.body)
              .fontSize(LAYOUT.sizes.body)
              .fillColor(LAYOUT.colors.darkGray)
              .text("•", bulletX, doc.y, { continued: false, width: 10 });

            doc
              .font(LAYOUT.fonts.body)
              .fontSize(LAYOUT.sizes.body)
              .fillColor(LAYOUT.colors.darkGray)
              .text(text.trim(), textX, doc.y - doc.currentLineHeight(), {
                width: LAYOUT.contentWidth - 22,
                lineGap: 2,
              });
          }
          doc.moveDown(0.2);
        };

        const renderSectionHeader = (title) => {
          const spaceNeeded = 40;
          if (doc.y + spaceNeeded > doc.page.height - LAYOUT.margin) {
            doc.addPage();
          }

          doc
            .font(LAYOUT.fonts.subheading)
            .fontSize(LAYOUT.sizes.sectionHeading)
            .fillColor(LAYOUT.colors.black)
            .text(title.toUpperCase(), { continued: false });

          const lineY = doc.y + 2;
          doc
            .moveTo(LAYOUT.margin, lineY)
            .lineTo(LAYOUT.margin + LAYOUT.contentWidth, lineY)
            .strokeColor(LAYOUT.colors.sectionLine)
            .lineWidth(1.5)
            .stroke();

          doc.moveDown(0.4);
        };

        // 1. Summary Section
        if (Array.isArray(resumeData.summary) && resumeData.summary.length > 0) {
          renderSectionHeader("Summary");
          resumeData.summary.forEach((paragraph) => {
            if (doc.y + 20 > doc.page.height - LAYOUT.margin) {
              doc.addPage();
            }
            doc
              .font(LAYOUT.fonts.body)
              .fontSize(LAYOUT.sizes.body)
              .fillColor(LAYOUT.colors.darkGray)
              .text(paragraph, LAYOUT.margin, doc.y, {
                width: LAYOUT.contentWidth,
                lineGap: 2,
              });
            doc.moveDown(0.2);
          });
          doc.moveDown(0.4);
        }

        // 2. Skills Section
        if (Array.isArray(resumeData.skills) && resumeData.skills.length > 0) {
          renderSectionHeader("Skills");
          if (doc.y + 20 > doc.page.height - LAYOUT.margin) {
            doc.addPage();
          }
          doc
            .font(LAYOUT.fonts.body)
            .fontSize(LAYOUT.sizes.body)
            .fillColor(LAYOUT.colors.darkGray)
            .text(resumeData.skills.join("  |  "), LAYOUT.margin, doc.y, {
              width: LAYOUT.contentWidth,
              lineGap: 2,
            });
          doc.moveDown(0.8);
        }

        // 3. Experience Section
        if (Array.isArray(resumeData.experience) && resumeData.experience.length > 0) {
          renderSectionHeader("Experience");
          resumeData.experience.forEach((job) => {
            if (doc.y + 30 > doc.page.height - LAYOUT.margin) {
              doc.addPage();
            }
            doc
              .font(LAYOUT.fonts.subheading)
              .fontSize(LAYOUT.sizes.body)
              .fillColor(LAYOUT.colors.black)
              .text(`${job.role} - ${job.company}`);
            doc.moveDown(0.1);

            if (Array.isArray(job.bullets)) {
              job.bullets.forEach((bullet) => renderBullet(bullet));
            }
            doc.moveDown(0.4);
          });
        }

        // 4. Projects Section
        if (Array.isArray(resumeData.projects) && resumeData.projects.length > 0) {
          renderSectionHeader("Projects");
          resumeData.projects.forEach((project) => {
            if (doc.y + 30 > doc.page.height - LAYOUT.margin) {
              doc.addPage();
            }
            doc
              .font(LAYOUT.fonts.subheading)
              .fontSize(LAYOUT.sizes.body)
              .fillColor(LAYOUT.colors.black)
              .text(project.title);
            doc.moveDown(0.1);

            if (Array.isArray(project.bullets)) {
              project.bullets.forEach((bullet) => renderBullet(bullet));
            }
            doc.moveDown(0.4);
          });
        }

        // 5. Education Section
        if (Array.isArray(resumeData.education) && resumeData.education.length > 0) {
          renderSectionHeader("Education");
          resumeData.education.forEach((edu) => {
            if (doc.y + 20 > doc.page.height - LAYOUT.margin) {
              doc.addPage();
            }
            doc
              .font(LAYOUT.fonts.body)
              .fontSize(LAYOUT.sizes.body)
              .fillColor(LAYOUT.colors.darkGray)
              .text(edu, LAYOUT.margin, doc.y, {
                width: LAYOUT.contentWidth,
                lineGap: 2,
              });
            doc.moveDown(0.2);
          });
        }

      } else {
        // resume text ko sections me parse karo
        const sections = parseResumeIntoSections(improvedResumeText);

        // har section ko render karo — heading, line, content
        sections.forEach((section, sectionIndex) => {
          // pehle section ke upar extra spacing nahi chahiye
          if (sectionIndex > 0) {
            doc.moveDown(0.6);
          }

          // check karo ki page pe enough space hai section heading ke liye.
          // Agar nahi toh naya page shuru karo — heading akele page ke bottom pe na rahe.
          const spaceNeeded = 40;
          if (doc.y + spaceNeeded > doc.page.height - LAYOUT.margin) {
            doc.addPage();
          }

          // section heading render karo — bold, slightly larger font
          const sectionTitle = formatSectionTitle(section.title);
          doc
            .font(LAYOUT.fonts.subheading)
            .fontSize(LAYOUT.sizes.sectionHeading)
            .fillColor(LAYOUT.colors.black)
            .text(sectionTitle.toUpperCase(), {
              continued: false,
            });

          // heading ke neeche ek colored line draw karo — professional look ke liye
          const lineY = doc.y + 2;
          doc
            .moveTo(LAYOUT.margin, lineY)
            .lineTo(LAYOUT.margin + LAYOUT.contentWidth, lineY)
            .strokeColor(LAYOUT.colors.sectionLine)
            .lineWidth(1.5)
            .stroke();

          doc.moveDown(0.4);

          // section ka content parse karo aur har line render karo
          const contentItems = parseContentLines(section.content);

          contentItems.forEach((item) => {
            // page overflow check — agar line page ke bottom se neeche jaayegi toh naya page
            if (doc.y + 20 > doc.page.height - LAYOUT.margin) {
              doc.addPage();
            }

            if (item.isGap) {
              // [GAP] markers red me render karo — yeh genuine skill gaps hain
              doc
                .font(LAYOUT.fonts.bodyItalic)
                .fontSize(LAYOUT.sizes.small)
                .fillColor(LAYOUT.colors.gapMarker)
                .text(item.text, LAYOUT.margin + 15, doc.y, {
                  width: LAYOUT.contentWidth - 15,
                  lineGap: 3,
                });
            } else if (item.isBullet) {
              // bullet points ko indent ke saath render karo — bullet symbol + text
              const bulletX = LAYOUT.margin + 10;
              const textX = LAYOUT.margin + 22;

              doc
                .font(LAYOUT.fonts.body)
                .fontSize(LAYOUT.sizes.body)
                .fillColor(LAYOUT.colors.darkGray)
                .text("•", bulletX, doc.y, { continued: false, width: 10 });

              // bullet symbol ke baad actual text — thoda right me offset
              doc
                .font(LAYOUT.fonts.body)
                .fontSize(LAYOUT.sizes.body)
                .fillColor(LAYOUT.colors.darkGray)
                .text(item.text, textX, doc.y - doc.currentLineHeight(), {
                  width: LAYOUT.contentWidth - 22,
                  lineGap: 2,
                });
            } else {
              // normal text — no bullet, no indent
              doc
                .font(LAYOUT.fonts.body)
                .fontSize(LAYOUT.sizes.body)
                .fillColor(LAYOUT.colors.darkGray)
                .text(item.text, LAYOUT.margin, doc.y, {
                  width: LAYOUT.contentWidth,
                  lineGap: 2,
                });
            }

            doc.moveDown(0.2);
          });
        });
      }

      // PDF finalize karo — saare pages flush ho jayenge aur "end" event fire hoga
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
