import mongoose, { Schema, Document } from "mongoose";

export interface ILabResult extends Document {
  patient: mongoose.Types.ObjectId;
  uploadedBy: string;
  testType: string;
  bodyPart?: string;
  imageUrl?: string;
  aiAnalysis?: string;
  doctorNotes?: string;
  status: "pending" | "analyzed" | "reviewed";
  createdAt: Date;
  updatedAt: Date;
}

const LabResultSchema: Schema = new Schema(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    uploadedBy: {
      type: String,
      required: true,
    },

    testType: {
      type: String,
      required: true,
      default: "X-Ray",
    },

    bodyPart: {
      type: String,
    },

    imageUrl: {
      type: String,
    },

    aiAnalysis: {
      type: String,
      default: "Pending Analysis...",
    },

    doctorNotes: {
      type: String,
    },

    status: {
      type: String,
      enum: ["pending", "analyzed", "reviewed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<ILabResult>(
  "LabResult",
  LabResultSchema,
);