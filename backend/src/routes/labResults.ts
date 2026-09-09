import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";

import {
  createLabResult,
  getPatientLabResults,
  updateLabResult,
} from "../controllers/labResults";

const labResultsRouter = Router();

/*
 * Create a lab result / upload X-Ray.
 *
 * Allowed:
 * - admin
 * - doctor
 * - lab_tech
 *
 * Patients and nurses cannot create lab results.
 */
labResultsRouter.post(
  "/",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "lab_tech",
  ]),
  createLabResult,
);

/*
 * Get lab results for a patient.
 *
 * Allowed:
 * - admin
 * - doctor
 * - nurse
 * - lab_tech
 * - patient
 *
 * IMPORTANT:
 * The controller verifies that a patient can
 * only access their own patientId.
 */
labResultsRouter.get(
  "/patient/:patientId",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "nurse",
    "lab_tech",
    "patient",
  ]),
  getPatientLabResults,
);

/*
 * Update a lab result.
 *
 * Allowed:
 * - admin
 * - doctor
 * - lab_tech
 *
 * Field-level permissions are enforced inside
 * the controller:
 *
 * AI analysis:
 *   admin, lab_tech
 *
 * Doctor notes:
 *   admin, doctor
 *
 * Status:
 *   admin, doctor, lab_tech
 */
labResultsRouter.put(
  "/:id",
  requireAuth,
  checkRole([
    "admin",
    "doctor",
    "lab_tech",
  ]),
  updateLabResult,
);

export default labResultsRouter;