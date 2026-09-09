import mongoose, { Document, Schema } from "mongoose";

export interface ISettings extends Document {
  hospitalName: string;
  hospitalEmail: string;
  hospitalPhone: string;
  hospitalAddress: string;
  timezone: string;
  currency: string;
  dateFormat: string;

  // Billing settings
  taxEnabled: boolean;
  taxPercentage: number;
  consultationFee: number;
  xrayFee: number;
  laboratoryFee: number;
  pharmacyFee: number;
  paymentProvider: "polar";
  paymentMode: "sandbox" | "production";
  autoGenerateInvoice: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema(
  {
    hospitalName: {
      type: String,
      required: true,
      default: "MedFlow AI Hospital",
      trim: true,
    },

    hospitalEmail: {
      type: String,
      default: "",
      trim: true,
    },

    hospitalPhone: {
      type: String,
      default: "",
      trim: true,
    },

    hospitalAddress: {
      type: String,
      default: "",
      trim: true,
    },

    timezone: {
      type: String,
      default: "Asia/Kolkata",
      trim: true,
    },

    currency: {
      type: String,
      default: "USD",
      trim: true,
    },

    dateFormat: {
      type: String,
      default: "DD/MM/YYYY",
      trim: true,
    },

    // --------------------------------------------------
    // Billing Settings
    // --------------------------------------------------

    taxEnabled: {
      type: Boolean,
      default: false,
    },

    taxPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    /*
     * All fees are stored in the smallest currency unit.
     *
     * Example for INR:
     * 50000 = ₹500.00
     * 150000 = ₹1,500.00
     *
     * This keeps the billing system consistent with
     * the existing invoice model and Polar checkout,
     * which currently use cents.
     */

    consultationFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    xrayFee: {
      type: Number,
      default: 15000,
      min: 0,
    },

    laboratoryFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    pharmacyFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentProvider: {
      type: String,
      enum: ["polar"],
      default: "polar",
    },

    paymentMode: {
      type: String,
      enum: ["sandbox", "production"],
      default: "sandbox",
    },

    autoGenerateInvoice: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<ISettings>(
  "Settings",
  SettingsSchema,
);