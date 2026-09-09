import mongoose, { Document, Schema } from "mongoose";

export interface ILabRequest extends Document {
  patientId: string;
  doctorId: string;
  testName: string;
  testType: string;
  priority: "normal" | "urgent";
  status: "requested" | "processing" | "completed" | "cancelled";
  notes?: string;
  requestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LabRequestSchema = new Schema(
  {
    patientId: {
      type: String,
      required: true,
    },

    doctorId: {
      type: String,
      required: true,
    },

    testName: {
      type: String,
      required: true,
      trim: true,
    },

    testType: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      enum: ["normal", "urgent"],
      default: "normal",
    },

    status: {
      type: String,
      enum: [
        "requested",
        "processing",
        "completed",
        "cancelled",
      ],
      default: "requested",
    },

    notes: {
      type: String,
      trim: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<ILabRequest>(
  "LabRequest",
  LabRequestSchema,
);