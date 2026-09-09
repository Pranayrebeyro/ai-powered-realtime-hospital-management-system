import mongoose, { Document, Schema } from "mongoose";

export interface IMedicine extends Document {
  name: string;
  category: string;
  manufacturer?: string;
  batchNumber?: string;
  quantity: number;
  unitPrice: number;
  expiryDate?: Date;
  reorderLevel: number;
  status: "available" | "low_stock" | "out_of_stock" | "expired";
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    expiryDate: {
      type: Date,
    },
    reorderLevel: {
      type: Number,
      min: 0,
      default: 10,
    },
    status: {
      type: String,
      enum: ["available", "low_stock", "out_of_stock", "expired"],
      default: "available",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IMedicine>("Medicine", MedicineSchema);