import type { Request, Response } from "express";
import mongoose from "mongoose";
import Telemedicine from "../models/telemedicine";

const getCurrentUser = (req: Request) => {
  return (req as any).user;
};

const getUserCollection = () => {
  return mongoose.connection.collection("user");
};

const getUserObjectId = (id: string) => {
  return mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;
};

const userHasRole = async (
  userId: string,
  role: string,
) => {
  const user = await getUserCollection().findOne({
    _id: getUserObjectId(userId) as any,
  });

  return user?.role === role;
};

const validStatuses = [
  "scheduled",
  "active",
  "completed",
  "cancelled",
];

/*
 * Roles that are allowed to use the telemedicine module.
 */
const allowedRoles = [
  "admin",
  "doctor",
  "nurse",
  "patient",
];

const hasAllowedRole = (role: string) => {
  return allowedRoles.includes(role);
};

export const getTelemedicineSessions = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getCurrentUser(req);

    if (!user?.id || !user?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!hasAllowedRole(user.role)) {
      return res.status(403).json({
        message:
          "Forbidden: You do not have permission to access telemedicine",
      });
    }

    /*
     * Patients can only see their own sessions.
     *
     * Doctors can only see sessions assigned to them.
     *
     * Admins and nurses can see all sessions.
     */
    let filter: Record<string, string> = {};

    if (user.role === "patient") {
      filter = {
        patientId: user.id,
      };
    } else if (user.role === "doctor") {
      filter = {
        doctorId: user.id,
      };
    }

    const sessions = await Telemedicine.find(filter).sort({
      scheduledAt: 1,
    });

    return res.status(200).json(sessions);
  } catch (error) {
    console.error(
      "Error fetching telemedicine sessions:",
      error,
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getTelemedicineSessionById = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getCurrentUser(req);

    if (!user?.id || !user?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!hasAllowedRole(user.role)) {
      return res.status(403).json({
        message:
          "Forbidden: You do not have permission to access telemedicine",
      });
    }

    const session = await Telemedicine.findById(
      req.params.id,
    );

    if (!session) {
      return res.status(404).json({
        message: "Telemedicine session not found",
      });
    }

    /*
     * Patients can only view their own sessions.
     */
    if (
      user.role === "patient" &&
      session.patientId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only view your own telemedicine sessions",
      });
    }

    /*
     * Doctors can only view sessions assigned to them.
     */
    if (
      user.role === "doctor" &&
      session.doctorId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only view your own telemedicine sessions",
      });
    }

    return res.status(200).json(session);
  } catch (error) {
    console.error(
      "Error fetching telemedicine session:",
      error,
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const createTelemedicineSession = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getCurrentUser(req);

    if (!user?.id || !user?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!hasAllowedRole(user.role)) {
      return res.status(403).json({
        message:
          "Forbidden: You do not have permission to create telemedicine sessions",
      });
    }

    const {
      patientId,
      doctorId,
      appointmentId,
      scheduledAt,
      meetingUrl,
      notes,
    } = req.body;

    if (!patientId || !doctorId || !scheduledAt) {
      return res.status(400).json({
        message:
          "Patient, doctor, and scheduled time are required",
      });
    }

    /*
     * Patients can only create sessions for themselves.
     */
    if (
      user.role === "patient" &&
      patientId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only create telemedicine sessions for yourself",
      });
    }

    /*
     * Doctors can only create sessions using their own doctor ID.
     */
    if (
      user.role === "doctor" &&
      doctorId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Doctors can only create sessions for themselves",
      });
    }

    /*
     * Verify that the patient actually exists
     * and has the patient role.
     */
    const patientExists = await userHasRole(
      patientId,
      "patient",
    );

    if (!patientExists) {
      return res.status(400).json({
        message: "Invalid patient",
      });
    }

    /*
     * Verify that the doctor actually exists
     * and has the doctor role.
     */
    const doctorExists = await userHasRole(
      doctorId,
      "doctor",
    );

    if (!doctorExists) {
      return res.status(400).json({
        message: "Invalid doctor",
      });
    }

    /*
     * Validate scheduled time.
     */
    const parsedDate = new Date(scheduledAt);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        message: "Invalid scheduled time",
      });
    }

    const session = await Telemedicine.create({
      patientId,
      doctorId,
      appointmentId,
      scheduledAt: parsedDate,
      meetingUrl,
      notes,
      status: "scheduled",
    });

    return res.status(201).json(session);
  } catch (error) {
    console.error(
      "Error creating telemedicine session:",
      error,
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const updateTelemedicineSession = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getCurrentUser(req);

    if (!user?.id || !user?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!hasAllowedRole(user.role)) {
      return res.status(403).json({
        message:
          "Forbidden: You do not have permission to update telemedicine sessions",
      });
    }

    /*
     * Patients cannot update telemedicine sessions.
     */
    if (user.role === "patient") {
      return res.status(403).json({
        message:
          "Forbidden: Patients cannot update telemedicine sessions",
      });
    }

    const session = await Telemedicine.findById(
      req.params.id,
    );

    if (!session) {
      return res.status(404).json({
        message: "Telemedicine session not found",
      });
    }

    /*
     * Doctors can only update their own sessions.
     */
    if (
      user.role === "doctor" &&
      session.doctorId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only update your own telemedicine sessions",
      });
    }

    /*
     * Only these fields can be updated.
     *
     * patientId and doctorId are intentionally excluded
     * so a session cannot be reassigned through this endpoint.
     */
    const allowedFields = [
      "appointmentId",
      "scheduledAt",
      "meetingUrl",
      "status",
      "notes",
    ];

    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (
        req.body[field] !== undefined &&
        req.body[field] !== null
      ) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    /*
     * Validate status.
     */
    if (
      updateData.status !== undefined &&
      !validStatuses.includes(
        String(updateData.status),
      )
    ) {
      return res.status(400).json({
        message: "Invalid telemedicine session status",
      });
    }

    /*
     * Validate scheduled time.
     */
    if (updateData.scheduledAt !== undefined) {
      const parsedDate = new Date(
        String(updateData.scheduledAt),
      );

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          message: "Invalid scheduled time",
        });
      }

      updateData.scheduledAt = parsedDate;
    }

    const updatedSession =
      await Telemedicine.findByIdAndUpdate(
        req.params.id,
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (!updatedSession) {
      return res.status(404).json({
        message: "Telemedicine session not found",
      });
    }

    return res.status(200).json(updatedSession);
  } catch (error) {
    console.error(
      "Error updating telemedicine session:",
      error,
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const deleteTelemedicineSession = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getCurrentUser(req);

    if (!user?.id || !user?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!hasAllowedRole(user.role)) {
      return res.status(403).json({
        message:
          "Forbidden: You do not have permission to delete telemedicine sessions",
      });
    }

    /*
     * Patients cannot delete telemedicine sessions.
     */
    if (user.role === "patient") {
      return res.status(403).json({
        message:
          "Forbidden: Patients cannot delete telemedicine sessions",
      });
    }

    const session = await Telemedicine.findById(
      req.params.id,
    );

    if (!session) {
      return res.status(404).json({
        message: "Telemedicine session not found",
      });
    }

    /*
     * Doctors can only delete their own sessions.
     */
    if (
      user.role === "doctor" &&
      session.doctorId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only delete your own telemedicine sessions",
      });
    }

    await Telemedicine.findByIdAndDelete(
      req.params.id,
    );

    return res.status(200).json({
      message:
        "Telemedicine session deleted successfully",
    });
  } catch (error) {
    console.error(
      "Error deleting telemedicine session:",
      error,
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};