import mongoose, { Document, Schema } from "mongoose";

export interface ITelemedicine extends Document {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  scheduledAt: Date;
  meetingUrl?: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TelemedicineSchema = new Schema(
  {
    patientId: {
      type: String,
      required: true,
    },

    doctorId: {
      type: String,
      required: true,
    },

    appointmentId: {
      type: String,
    },

    scheduledAt: {
      type: Date,
      required: true,
    },

    meetingUrl: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "scheduled",
        "active",
        "completed",
        "cancelled",
      ],
      default: "scheduled",
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<ITelemedicine>(
  "Telemedicine",
  TelemedicineSchema,
);