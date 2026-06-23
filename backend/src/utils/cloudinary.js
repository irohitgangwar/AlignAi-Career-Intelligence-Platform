import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

// Hinglish: buffer ko direct Cloudinary stream me bhej rahe hain, disk pe file save nahi ho rahi.
const uploadBufferToCloudinary = (fileBuffer, fileName = "resume.pdf") => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(new Error("Cloudinary config is missing"));
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "alignai/resumes",
        public_id: `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9-_]/g, "_")}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    // Hinglish: RAM me jo PDF aayi hai usko stream ke through upload kar do.
    stream.end(fileBuffer);
  });
};

const deleteFromCloudinary = async (publicId, resourceType = "raw") => {
  try {
    if (!publicId) return null;
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return response;
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
    return null;
  }
};

export { uploadBufferToCloudinary, deleteFromCloudinary, isCloudinaryConfigured };
