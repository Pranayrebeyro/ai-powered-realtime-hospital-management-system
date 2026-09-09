import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import {
  getSettings,
  updateSettings,
} from "../controllers/settings";

const router = Router();

router.get(
  "/",
  requireAuth,
  checkRole(["admin"]),
  getSettings,
);

router.put(
  "/",
  requireAuth,
  checkRole(["admin"]),
  updateSettings,
);

export default router;