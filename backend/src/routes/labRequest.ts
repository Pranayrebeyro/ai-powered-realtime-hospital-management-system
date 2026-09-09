import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";

import {
  getLabRequests,
  getLabRequestById,
  createLabRequest,
  updateLabRequest,
  deleteLabRequest,
} from "../controllers/labRequest";

const router = Router();

/*
 * View lab requests
 */
router.get(
  "/",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "nurse",
    "lab_tech",
  ]),
  getLabRequests,
);

router.get(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "nurse",
    "lab_tech",
  ]),
  getLabRequestById,
);

/*
 * Create lab requests
 */
router.post(
  "/",
  requireAuth,
  checkRole(["admin", "doctor"]),
  createLabRequest,
);

/*
 * Update lab requests
 */
router.put(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "lab_tech",
  ]),
  updateLabRequest,
);

/*
 * Delete lab requests
 */
router.delete(
  "/:id",
  requireAuth,
  checkRole(["admin", "doctor"]),
  deleteLabRequest,
);

export default router;