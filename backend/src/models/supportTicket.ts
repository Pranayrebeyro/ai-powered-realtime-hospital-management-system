import mongoose, { Document, Schema } from "mongoose";

export interface ISupportTicket extends Document {
  userId: string;
  subject: string;
  category: "technical" | "billing" | "account" | "medical" | "other";
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  adminResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    category: {
      type: String,
      enum: ["technical", "billing", "account", "medical", "other"],
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },

    adminResponse: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<ISupportTicket>(
  "SupportTicket",
  SupportTicketSchema,
);