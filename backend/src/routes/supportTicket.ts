import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";

import {
  getSupportTickets,
  getSupportTicketById,
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
} from "../controllers/supportTicket";

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
  getSupportTickets,
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
  getSupportTicketById,
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
  createSupportTicket,
);

router.put(
  "/:id",
  requireAuth,
  checkRole(["admin"]),
  updateSupportTicket,
);

router.delete(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "nurse",
    "pharmacist",
    "lab_tech",
  ]),
  deleteSupportTicket,
);

export default router;