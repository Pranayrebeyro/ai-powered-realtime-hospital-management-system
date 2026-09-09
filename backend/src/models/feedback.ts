import mongoose, { Document, Schema } from "mongoose";

export interface IFeedback extends Document {
  userId: string;
  rating: number;
  category:
    | "service"
    | "doctor"
    | "nursing"
    | "pharmacy"
    | "laboratory"
    | "technical"
    | "other";
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    category: {
      type: String,
      enum: [
        "service",
        "doctor",
        "nursing",
        "pharmacy",
        "laboratory",
        "technical",
        "other",
      ],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IFeedback>(
  "Feedback",
  FeedbackSchema,
);