// simple structured logger jo sensitive details (API keys, resumeText, jobDescription) ko log karne se bachaata hai.
// console.log/warn/error ko standardize karta hai with timestamp.

function sanitizeMetadata(metadata = {}) {
  const sanitized = { ...metadata };
  // sensitive keys ko clean karo
  const keysToFilter = ["resumeText", "jobDescription", "improvedResumeText", "password", "token", "apiKey"];
  for (const key of keysToFilter) {
    if (key in sanitized) {
      sanitized[key] = "[FILTERED_FOR_PRIVACY]";
    }
  }
  return sanitized;
}

export const logger = {
  info: (message, metadata = {}) => {
    const meta = sanitizeMetadata(metadata);
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, Object.keys(meta).length ? meta : "");
  },
  warn: (message, metadata = {}) => {
    const meta = sanitizeMetadata(metadata);
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, Object.keys(meta).length ? meta : "");
  },
  error: (message, error, metadata = {}) => {
    const meta = sanitizeMetadata(metadata);
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}: ${errMessage}`, Object.keys(meta).length ? meta : "");
  }
};
