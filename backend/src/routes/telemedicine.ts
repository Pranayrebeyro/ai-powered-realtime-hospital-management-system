import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import {
  getTelemedicineSessions,
  getTelemedicineSessionById,
  createTelemedicineSession,
  updateTelemedicineSession,
  deleteTelemedicineSession,
} from "../controllers/telemedicine";

const router = Router();

router.get(
  "/",
  requireAuth,
  checkRole(["admin", "doctor", "nurse", "patient"]),
  getTelemedicineSessions,
);

router.get(
  "/:id",
  requireAuth,
  checkRole(["admin", "doctor", "nurse", "patient"]),
  getTelemedicineSessionById,
);

router.post(
  "/",
  requireAuth,
  checkRole(["admin", "doctor", "patient"]),
  createTelemedicineSession,
);

router.put(
  "/:id",
  requireAuth,
  checkRole(["admin", "doctor", "nurse"]),
  updateTelemedicineSession,
);

router.delete(
  "/:id",
  requireAuth,
  checkRole(["admin", "doctor"]),
  deleteTelemedicineSession,
);

export default router;