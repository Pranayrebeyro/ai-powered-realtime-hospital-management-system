import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
  user: mongoose.Types.ObjectId;
  action: string;
  details?: string;
  createdAt: Date;
}

const activityLogSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    details: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Optimize newest-first activity-log queries.
activityLogSchema.index({ createdAt: -1 });

export default mongoose.model<IActivityLog>(
  "ActivityLog",
  activityLogSchema,
);