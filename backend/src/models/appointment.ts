import mongoose, { Document, Schema } from "mongoose";

export interface IAppointment extends Document {
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  reason: string;
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema(
  {
    patientId: {
      type: String,
      required: true,
    },

    doctorId: {
      type: String,
      required: true,
    },

    appointmentDate: {
      type: Date,
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
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

export default mongoose.model<IAppointment>(
  "Appointment",
  AppointmentSchema,
);