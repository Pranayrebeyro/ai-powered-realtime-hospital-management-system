import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";

import {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription,
  dispensePrescription,
} from "../controllers/prescription";

const router = Router();

/*
 * View prescriptions
 *
 * Ownership filtering for patients will be handled
 * inside the controller.
 */
router.get(
  "/",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "pharmacist",
    "patient",
  ]),
  getPrescriptions,
);

router.get(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "pharmacist",
    "patient",
  ]),
  getPrescriptionById,
);

/*
 * Create prescription
 *
 * Doctors create prescriptions.
 * Admins can also create them.
 */
router.post(
  "/",
  requireAuth,
  checkRole(["admin", "doctor"]),
  createPrescription,
);

/*
 * Dispense prescription
 *
 * Pharmacy staff handle dispensing.
 */
router.put(
  "/:id/dispense",
  requireAuth,
  checkRole(["admin", "pharmacist"]),
  dispensePrescription,
);

/*
 * Update prescription
 */
router.put(
  "/:id",
  requireAuth,
  checkRole(["admin", "doctor"]),
  updatePrescription,
);

/*
 * Delete prescription
 */
router.delete(
  "/:id",
  requireAuth,
  checkRole(["admin", "doctor"]),
  deletePrescription,
);

export default router;