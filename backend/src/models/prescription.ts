import mongoose, { Schema, Document } from "mongoose";

export interface IPrescription extends Document {
  patientId: string;
  doctorId: string;
  medicines: {
    medicineId: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
  }[];
  instructions?: string;
  status: "active" | "dispensed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionSchema = new Schema(
  {
    patientId: {
      type: String,
      required: true,
    },
    doctorId: {
      type: String,
      required: true,
    },
    medicines: [
      {
        medicineId: {
          type: String,
          required: true,
        },
        medicineName: {
          type: String,
          required: true,
        },
        dosage: {
          type: String,
          required: true,
        },
        frequency: {
          type: String,
          required: true,
        },
        duration: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    instructions: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "dispensed", "cancelled"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IPrescription>(
  "Prescription",
  PrescriptionSchema,
);