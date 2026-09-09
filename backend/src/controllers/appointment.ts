import mongoose from "mongoose";
import type { Request, Response } from "express";
import Appointment from "../models/appointment";

type Role =
  | "admin"
  | "doctor"
  | "nurse"
  | "pharmacist"
  | "lab_tech"
  | "patient";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: Role;
  };
};

/**
 * Get the authenticated user.
 */
const getCurrentUser = (req: Request) => {
  return (req as any).user;
};

/**
 * Normalize Express route parameters.
 */
const normalizeId = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim();
};

/**
 * Convert a Better Auth user ID to MongoDB ObjectId
 * when possible.
 */
const getUserObjectId = (id: string) => {
  return mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;
};

/**
 * Better Auth stores users in the "user" collection.
 */
const getUserCollection = () => {
  return mongoose.connection.collection("user");
};

/**
 * Verify that a user exists and has the expected role.
 */
const userHasRole = async (
  userId: string,
  role: string,
) => {
  const collection = getUserCollection();

  const user = await collection.findOne({
    _id: getUserObjectId(userId) as any,
    role,
  });

  return Boolean(user);
};

/**
 * Get all appointments.
 *
 * Permissions:
 * - admin/nurse: all appointments
 * - doctor: only their appointments
 * - patient: only their appointments
 */
export const getAppointments = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const currentUser = getCurrentUser(req);

    if (!currentUser?.id || !currentUser?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    let filter: Record<string, unknown> = {};

    if (currentUser.role === "patient") {
      filter = {
        patientId: currentUser.id,
      };
    } else if (currentUser.role === "doctor") {
      filter = {
        doctorId: currentUser.id,
      };
    } else if (
      currentUser.role === "admin" ||
      currentUser.role === "nurse"
    ) {
      filter = {};
    } else {
      return res.status(403).json({
        message: "Forbidden: Insufficient Permissions",
      });
    }

    const appointments = await Appointment.find(filter)
      .sort({ appointmentDate: 1 })
      .lean();

    return res.status(200).json(appointments);
  } catch (error) {
    console.error(
      "Error fetching appointments:",
      error,
    );

    return res.status(500).json({
      message: "Failed to fetch appointments",
    });
  }
};

/**
 * Get a single appointment.
 *
 * Permissions:
 * - admin/nurse: any appointment
 * - doctor: only their appointment
 * - patient: only their appointment
 */
export const getAppointmentById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const currentUser = getCurrentUser(req);
    const id = normalizeId(req.params.id);

    if (!currentUser?.id || !currentUser?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!id) {
      return res.status(400).json({
        message: "Appointment ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid appointment ID",
      });
    }

    const appointment = await Appointment.findById(id).lean();

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    if (
      currentUser.role === "patient" &&
      appointment.patientId !== currentUser.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only access your own appointments",
      });
    }

    if (
      currentUser.role === "doctor" &&
      appointment.doctorId !== currentUser.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only access your own appointments",
      });
    }

    return res.status(200).json(appointment);
  } catch (error) {
    console.error(
      "Error fetching appointment:",
      error,
    );

    return res.status(500).json({
      message: "Failed to fetch appointment",
    });
  }
};

/**
 * Create an appointment.
 *
 * Permissions:
 * - admin: any valid patient + doctor
 * - doctor: only themselves as doctor
 * - patient: only themselves as patient
 */
export const createAppointment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const currentUser = getCurrentUser(req);

    if (!currentUser?.id || !currentUser?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const {
      patientId,
      doctorId,
      appointmentDate,
      reason,
      notes,
      status,
    } = req.body;

    // -----------------------------
    // Validate patientId
    // -----------------------------

    if (
      typeof patientId !== "string" ||
      !patientId.trim()
    ) {
      return res.status(400).json({
        message: "Valid patientId is required",
      });
    }

    // -----------------------------
    // Validate doctorId
    // -----------------------------

    if (
      typeof doctorId !== "string" ||
      !doctorId.trim()
    ) {
      return res.status(400).json({
        message: "Valid doctorId is required",
      });
    }

    const normalizedPatientId = patientId.trim();
    const normalizedDoctorId = doctorId.trim();

    // -----------------------------
    // Validate appointment date
    // -----------------------------

    if (
      typeof appointmentDate !== "string" &&
      !(appointmentDate instanceof Date)
    ) {
      return res.status(400).json({
        message: "Valid appointmentDate is required",
      });
    }

    const parsedAppointmentDate =
      new Date(appointmentDate);

    if (
      Number.isNaN(
        parsedAppointmentDate.getTime(),
      )
    ) {
      return res.status(400).json({
        message: "Invalid appointment date",
      });
    }

    // -----------------------------
    // Validate reason
    // -----------------------------

    if (
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        message: "Appointment reason is required",
      });
    }

    // -----------------------------
    // Validate notes
    // -----------------------------

    if (
      notes !== undefined &&
      notes !== null &&
      typeof notes !== "string"
    ) {
      return res.status(400).json({
        message: "Notes must be a string",
      });
    }

    // -----------------------------
    // Validate status
    // -----------------------------

    const allowedStatuses = [
      "scheduled",
      "completed",
      "cancelled",
    ];

    if (
      status !== undefined &&
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid appointment status",
      });
    }

    // -----------------------------
    // Patient ownership
    // -----------------------------

    if (
      currentUser.role === "patient" &&
      normalizedPatientId !== currentUser.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Patients can only create appointments for themselves",
      });
    }

    // -----------------------------
    // Doctor ownership
    // -----------------------------

    if (
      currentUser.role === "doctor" &&
      normalizedDoctorId !== currentUser.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Doctors can only create appointments for themselves",
      });
    }

    // -----------------------------
    // Verify patient exists
    // -----------------------------

    const patientExists = await userHasRole(
      normalizedPatientId,
      "patient",
    );

    if (!patientExists) {
      return res.status(400).json({
        message:
          "Invalid patient: patient does not exist",
      });
    }

    // -----------------------------
    // Verify doctor exists
    // -----------------------------

    const doctorExists = await userHasRole(
      normalizedDoctorId,
      "doctor",
    );

    if (!doctorExists) {
      return res.status(400).json({
        message:
          "Invalid doctor: doctor does not exist",
      });
    }

    // -----------------------------
    // Create appointment
    // -----------------------------

    const appointment = await Appointment.create({
      patientId: normalizedPatientId,
      doctorId: normalizedDoctorId,
      appointmentDate: parsedAppointmentDate,
      reason: reason.trim(),
      notes:
        typeof notes === "string"
          ? notes.trim()
          : undefined,
      status: status ?? "scheduled",
    });

    return res.status(201).json(appointment);
  } catch (error) {
    console.error(
      "Error creating appointment:",
      error,
    );

    return res.status(500).json({
      message: "Failed to create appointment",
    });
  }
};

/**
 * Update an appointment.
 *
 * Permissions:
 * - admin: any appointment
 * - doctor: their own appointment
 * - nurse: appointments
 * - patient: blocked
 */
export const updateAppointment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const currentUser = getCurrentUser(req);
    const id = normalizeId(req.params.id);

    if (!currentUser?.id || !currentUser?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!id) {
      return res.status(400).json({
        message: "Appointment ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid appointment ID",
      });
    }

    // Patients cannot update appointments.
    if (currentUser.role === "patient") {
      return res.status(403).json({
        message:
          "Forbidden: Patients cannot update appointments",
      });
    }

    const appointment =
      await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    // Doctors can update only their own appointments.
    if (
      currentUser.role === "doctor" &&
      appointment.doctorId !== currentUser.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only update your own appointments",
      });
    }

    const {
      appointmentDate,
      reason,
      notes,
      status,
      patientId,
      doctorId,
    } = req.body;

    // -----------------------------
    // Prevent ownership reassignment
    // -----------------------------

    if (
      patientId !== undefined ||
      doctorId !== undefined
    ) {
      return res.status(400).json({
        message:
          "Patient and doctor cannot be changed",
      });
    }

    // -----------------------------
    // Update appointment date
    // -----------------------------

    if (appointmentDate !== undefined) {
      if (
        typeof appointmentDate !== "string" &&
        !(appointmentDate instanceof Date)
      ) {
        return res.status(400).json({
          message: "Invalid appointment date",
        });
      }

      const parsedDate =
        new Date(appointmentDate);

      if (
        Number.isNaN(parsedDate.getTime())
      ) {
        return res.status(400).json({
          message: "Invalid appointment date",
        });
      }

      appointment.appointmentDate = parsedDate;
    }

    // -----------------------------
    // Update reason
    // -----------------------------

    if (reason !== undefined) {
      if (
        typeof reason !== "string" ||
        !reason.trim()
      ) {
        return res.status(400).json({
          message:
            "Appointment reason cannot be empty",
        });
      }

      appointment.reason = reason.trim();
    }

    // -----------------------------
    // Update notes
    // -----------------------------

    if (notes !== undefined) {
      if (typeof notes !== "string") {
        return res.status(400).json({
          message: "Notes must be a string",
        });
      }

      appointment.notes = notes.trim();
    }

    // -----------------------------
    // Update status
    // -----------------------------

    if (status !== undefined) {
      const allowedStatuses = [
        "scheduled",
        "completed",
        "cancelled",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid appointment status",
        });
      }

      appointment.status = status;
    }

    await appointment.save();

    return res.status(200).json(
      appointment,
    );
  } catch (error) {
    console.error(
      "Error updating appointment:",
      error,
    );

    return res.status(500).json({
      message: "Failed to update appointment",
    });
  }
};

/**
 * Delete an appointment.
 *
 * Permissions:
 * - admin: any appointment
 * - doctor: only their own appointment
 * - patient: blocked
 *
 * Nurse DELETE is not exposed by the current route.
 */
export const deleteAppointment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const currentUser = getCurrentUser(req);
    const id = normalizeId(req.params.id);

    if (!currentUser?.id || !currentUser?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!id) {
      return res.status(400).json({
        message: "Appointment ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid appointment ID",
      });
    }

    // Patients cannot delete appointments.
    if (currentUser.role === "patient") {
      return res.status(403).json({
        message:
          "Forbidden: Patients cannot delete appointments",
      });
    }

    const appointment =
      await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    // Doctors can delete only their own appointments.
    if (
      currentUser.role === "doctor" &&
      appointment.doctorId !== currentUser.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only delete your own appointments",
      });
    }

    await Appointment.findByIdAndDelete(id);

    return res.status(200).json({
      message:
        "Appointment deleted successfully",
    });
  } catch (error) {
    console.error(
      "Error deleting appointment:",
      error,
    );

    return res.status(500).json({
      message: "Failed to delete appointment",
    });
  }
};