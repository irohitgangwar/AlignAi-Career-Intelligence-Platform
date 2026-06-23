import multer, { memoryStorage } from "multer";

// 1. Tell Multer to catch the file and hold it in RAM (Memory)
const storage = memoryStorage();

// 2. The Shield Rules (Only PDFs allowed!)
const fileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === "application/pdf";
  const isPdfExt = file.originalname.toLowerCase().endsWith(".pdf");

  if (isPdfMime && isPdfExt) {
    cb(null, true); // Let it pass
  } else {
    cb(new Error("Security Alert: Only PDF files are allowed!"), false); // Reject it
  }
};

// 3. Create the "Bouncer" middleware with all the upgrades
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: fileFilter, // Note the capital 'F' here!
});

// 4. Export it
export default upload;