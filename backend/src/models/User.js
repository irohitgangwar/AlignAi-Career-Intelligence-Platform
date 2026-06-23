import mongoose from "mongoose";

const resumeHistorySchema = new mongoose.Schema(
  {
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    publicId: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    companyName: { type: String, default: "Unknown Company" },
    jobTitle: { type: String, default: "Unknown Role" },
    jobDescription: { type: String, default: "" },
    analysisData: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, default: "completed" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    experience: { type: Number, default: 0 },
    currentRole: { type: String, default: "Fresher" },
    resumeText: { type: String, default: null },
    resumeFileUrl: { type: String, default: null },
    resumePublicId: { type: String, default: null },
    resumeFileName: { type: String, default: null },
    resumeHistory: { type: [resumeHistorySchema], default: [] },
    analyses: { type: [analysisSchema], default: [] },
    improvedResumeText: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
