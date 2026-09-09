import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";

import {
  getFeedback,
  getFeedbackById,
  createFeedback,
  updateFeedback,
  deleteFeedback,
} from "../controllers/feedback";

const router = Router();

router.get(
  "/",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "nurse",
    "pharmacist",
    "lab_tech",
  ]),
  getFeedback,
);

router.get(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "nurse",
    "pharmacist",
    "lab_tech",
  ]),
  getFeedbackById,
);

router.post(
  "/",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "nurse",
    "pharmacist",
    "lab_tech",
  ]),
  createFeedback,
);

router.put(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "nurse",
    "pharmacist",
    "lab_tech",
  ]),
  updateFeedback,
);

router.delete(
  "/:id",
  requireAuth,
  checkRole(["admin"]),
  deleteFeedback,
);

export default router;