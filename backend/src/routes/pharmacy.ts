import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";

import {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} from "../controllers/pharmacy";

const router = Router();

/*
 * View pharmacy inventory.
 *
 * Allowed:
 * - admin
 * - pharmacist
 * - doctor
 */
router.get(
  "/",
  requireAuth,
  checkRole([
    "admin",
    "pharmacist",
    "doctor",
  ]),
  getMedicines,
);

/*
 * View a specific medicine.
 *
 * Allowed:
 * - admin
 * - pharmacist
 * - doctor
 */
router.get(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "pharmacist",
    "doctor",
  ]),
  getMedicineById,
);

/*
 * Create pharmacy inventory.
 *
 * Allowed:
 * - admin
 * - pharmacist
 */
router.post(
  "/",
  requireAuth,
  checkRole([
    "admin",
    "pharmacist",
  ]),
  createMedicine,
);

/*
 * Update pharmacy inventory.
 *
 * Allowed:
 * - admin
 * - pharmacist
 */
router.put(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "pharmacist",
  ]),
  updateMedicine,
);

/*
 * Delete pharmacy inventory.
 *
 * Allowed:
 * - admin
 * - pharmacist
 */
router.delete(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "pharmacist",
  ]),
  deleteMedicine,
);

export default router;