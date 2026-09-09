import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";

import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../controllers/appointment";

const router = Router();

/*
 * View appointments
 */
router.get(
  "/",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "nurse",
    "patient",
  ]),
  getAppointments,
);

router.get(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "nurse",
    "patient",
  ]),
  getAppointmentById,
);

/*
 * Create appointments
 */
router.post(
  "/",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "patient",
  ]),
  createAppointment,
);

/*
 * Update appointments
 */
router.put(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "nurse",
  ]),
  updateAppointment,
);

/*
 * Delete appointments
 */
router.delete(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
  ]),
  deleteAppointment,
);

export default router;