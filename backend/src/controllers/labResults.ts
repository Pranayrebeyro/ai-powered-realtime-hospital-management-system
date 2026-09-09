import type { Request, Response } from "express";
import LabResult from "../models/labResults";
import { inngest } from "../inngest/client";
import { logActivity } from "../lib/activity";

const getCurrentUser = (req: Request) => {
  return (req as any).user;
};

const hasRole = (
  user: any,
  allowedRoles: string[],
) => {
  return (
    !!user?.role &&
    allowedRoles.includes(user.role)
  );
};

const allowedStatuses = [
  "pending",
  "analyzed",
  "reviewed",
] as const;

/*
 * Create a new lab result.
 *
 * Allowed:
 *   - admin
 *   - doctor
 *   - lab_tech
 *
 * Patients and nurses cannot upload lab results.
 */
export const createLabResult = async (
  req: Request,
  res: Response,
) => {
  try {
    const currentUser = getCurrentUser(req);
    const currentUserId = currentUser?.id;
    const currentUserRole = currentUser?.role;

    if (!currentUserId || !currentUserRole) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
     * Controller-level role protection.
     */
    if (
      !hasRole(currentUser, [
        "admin",
        "doctor",
        "lab_tech",
      ])
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Insufficient permissions",
      });
    }

    const {
      patientId,
      testType,
      bodyPart,
      imageUrl,
    } = req.body;

    if (!patientId || !testType) {
      return res.status(400).json({
        message:
          "Patient and test type are required",
      });
    }

    if (
      imageUrl !== undefined &&
      typeof imageUrl !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid image URL",
      });
    }

    const newLabResult =
      await LabResult.create({
        patient: patientId,
        testType,
        bodyPart,
        imageUrl,
        status: "pending",
        uploadedBy: currentUserId,
      });

    if (!newLabResult) {
      return res.status(400).json({
        message:
          "Failed to create lab result",
      });
    }

    /*
     * Realtime notification.
     */
    /*
 * Realtime notification.
 *
 * Send the lab result only to the patient-specific
 * Socket.IO room instead of broadcasting it globally.
 */
const io = req.app.get("io");

if (io) {
  io.to(
    `user_${newLabResult.patient.toString()}`,
  ).emit(
    "lab_result_added",
    {
      _id: newLabResult._id,
      patient: newLabResult.patient,
      testType: newLabResult.testType,
      bodyPart: newLabResult.bodyPart,
      aiAnalysis: newLabResult.aiAnalysis,
      doctorNotes: newLabResult.doctorNotes,
      status: newLabResult.status,
      createdAt: newLabResult.createdAt,
      updatedAt: newLabResult.updatedAt,
    },
  );
}

    /*
     * Trigger AI analysis and billing
     * for X-Ray results.
     */
    if (testType === "X-Ray") {
      await inngest.send({
        name: "labResult/created",
        data: {
          labResultId:
            newLabResult._id.toString(),
          imageUrl:
            newLabResult.imageUrl,
          bodyPart:
            newLabResult.bodyPart,
        },
      });

      /*
       * Trigger billing.
       */
      await inngest.send({
        name: "billing/charge.added",
        data: {
          patientId:
            newLabResult.patient.toString(),
          description:
            `Radiology: ${
              newLabResult.bodyPart ||
              "General"
            } X-Ray Analysis`,
          priceInCents: 15000,
        },
      });

      /*
       * Activity log.
       */
      await logActivity(
        currentUserId,
        "Uploaded Lab Result",
        `Uploaded ${testType} for ${
          bodyPart || "N/A"
        }`,
      );
    }

    return res.status(201).json(
      newLabResult,
    );
  } catch (error) {
    console.error(
      "Error creating lab result:",
      error,
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/*
 * Get all lab results for a specific patient.
 *
 * Admin:
 *   - Can view any patient's results.
 *
 * Doctor:
 *   - Can view patient results.
 *
 * Nurse:
 *   - Can view patient results.
 *
 * Lab Technician:
 *   - Can view patient results.
 *
 * Patient:
 *   - Can ONLY view their own results.
 *
 * This patient ownership check is important because
 * patientId comes directly from the URL.
 */
export const getPatientLabResults = async (
  req: Request,
  res: Response,
) => {
  try {
    const currentUser = getCurrentUser(req);

    if (
      !currentUser?.id ||
      !currentUser?.role
    ) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
     * All roles that can access lab results.
     */
    if (
      !hasRole(currentUser, [
        "admin",
        "doctor",
        "nurse",
        "lab_tech",
        "patient",
      ])
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Insufficient permissions",
      });
    }

    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        message:
          "Patient ID is required",
      });
    }

    /*
     * CRITICAL SECURITY CHECK:
     *
     * Patients may only request their own
     * lab results.
     */
    if (
      currentUser.role === "patient" &&
      patientId !== currentUser.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only access your own lab results",
      });
    }

    const results =
      await LabResult.find({
        patient: patientId,
      }).sort({
        createdAt: -1,
      });

    return res.status(200).json(results);
  } catch (error) {
    console.error(
      "Error fetching lab results:",
      error,
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/*
 * Update lab result.
 *
 * AI analysis:
 *   - admin
 *   - lab_tech
 *
 * Doctor notes:
 *   - admin
 *   - doctor
 *
 * Status:
 *   - admin
 *   - doctor
 *   - lab_tech
 *
 * Patients and nurses cannot update results.
 */
export const updateLabResult = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;

    const currentUser = getCurrentUser(req);

    const currentUserId =
      currentUser?.id;

    const currentUserRole =
      currentUser?.role;

    if (
      !currentUserId ||
      !currentUserRole
    ) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
     * Controller-level role protection.
     */
    if (
      !hasRole(currentUser, [
        "admin",
        "doctor",
        "lab_tech",
      ])
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Insufficient permissions",
      });
    }

    if (!id) {
      return res.status(400).json({
        message:
          "Lab result ID is required",
      });
    }

    const existingResult =
      await LabResult.findById(id);

    if (!existingResult) {
      return res.status(404).json({
        message:
          "Lab result not found",
      });
    }

    const {
      aiAnalysis,
      doctorNotes,
      status,
    } = req.body;

    if (
      aiAnalysis === undefined &&
      doctorNotes === undefined &&
      status === undefined
    ) {
      return res.status(400).json({
        message:
          "No fields provided for update",
      });
    }

    /*
     * Validate status before updating.
     */
    if (
      status !== undefined &&
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        message:
          "Invalid lab result status",
      });
    }

    /*
     * Explicit update allowlist.
     *
     * Ownership fields such as patient and
     * uploadedBy are never accepted.
     */
    const updateData: {
      aiAnalysis?: string;
      doctorNotes?: string;
      status?:
        | "pending"
        | "analyzed"
        | "reviewed";
    } = {};

    /*
     * AI analysis:
     *
     * Only admin and lab technician.
     */
    if (aiAnalysis !== undefined) {
      if (
        currentUserRole !== "admin" &&
        currentUserRole !== "lab_tech"
      ) {
        return res.status(403).json({
          message:
            "Forbidden: Only administrators and lab technicians can update AI analysis",
        });
      }

      if (
        typeof aiAnalysis !== "string"
      ) {
        return res.status(400).json({
          message:
            "AI analysis must be a string",
        });
      }

      updateData.aiAnalysis =
        aiAnalysis;
    }

    /*
     * Doctor notes:
     *
     * Only admin and doctor.
     */
    if (doctorNotes !== undefined) {
      if (
        currentUserRole !== "admin" &&
        currentUserRole !== "doctor"
      ) {
        return res.status(403).json({
          message:
            "Forbidden: Only administrators and doctors can update doctor notes",
        });
      }

      if (
        typeof doctorNotes !== "string"
      ) {
        return res.status(400).json({
          message:
            "Doctor notes must be a string",
        });
      }

      updateData.doctorNotes =
        doctorNotes;
    }

    /*
     * Status:
     *
     * Admin, doctor and lab technician
     * can update workflow status.
     */
    if (status !== undefined) {
      updateData.status = status;
    }

    if (
      Object.keys(updateData).length === 0
    ) {
      return res.status(400).json({
        message:
          "No permitted fields provided for update",
      });
    }

    const updatedResult =
      await LabResult.findByIdAndUpdate(
        id,
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (!updatedResult) {
      return res.status(404).json({
        message:
          "Lab result not found",
      });
    }

    /*
     * Realtime notification.
     */
    const io = req.app.get("io");

    if (io) {
  io.to(
    `user_${updatedResult.patient.toString()}`,
  ).emit(
    "lab_result_updated",
    {
      _id: updatedResult._id,
      patient: updatedResult.patient,
      testType: updatedResult.testType,
      bodyPart: updatedResult.bodyPart,
      aiAnalysis: updatedResult.aiAnalysis,
      doctorNotes: updatedResult.doctorNotes,
      status: updatedResult.status,
      createdAt: updatedResult.createdAt,
      updatedAt: updatedResult.updatedAt,
    },
  );
}

    /*
     * Activity log.
     */
    await logActivity(
      currentUserId,
      "Updated Lab Result",
      `Updated lab result ${id} with status ${
        status || "N/A"
      }`,
    );

    return res.status(200).json(
      updatedResult,
    );
  } catch (error) {
    console.error(
      "Error updating lab result:",
      error,
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};