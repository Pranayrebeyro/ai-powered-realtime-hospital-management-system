import express from "express";

const activityLogRouter = express.Router();

import { requireAuth } from "../middleware/auth";
import {
  addActivityLog,
  getActivityLogs,
} from "../controllers/activity";
import { checkRole } from "../middleware/checkRole";

// Only admins can fetch logs.
activityLogRouter.get(
  "/",
  requireAuth,
  checkRole(["admin"]),
  getActivityLogs,
);

// Only admins can manually create activity logs.
activityLogRouter.post(
  "/create",
  requireAuth,
  checkRole(["admin"]),
  addActivityLog,
);

export default activityLogRouter;