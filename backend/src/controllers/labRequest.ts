import type { Request, Response } from "express";
import LabRequest from "../models/labRequest";

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

/*
 * Get all lab requests visible to the current user.
 *
 * Admin:
 *   - Can view all lab requests.
 *
 * Doctor:
 *   - Can view only lab requests assigned to them.
 *
 * Nurse / Lab Technician:
 *   - Can view all lab requests.
 *
 * Patients:
 *   - Not allowed.
 */
export const getLabRequests = async (
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

    /*
     * Controller-level role protection.
     */
    if (
      !hasRole(user, [
        "admin",
        "doctor",
        "nurse",
        "lab_tech",
      ])
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Insufficient Permissions",
      });
    }

    let filter: Record<string, unknown> = {};

    /*
     * Doctors can only see their own lab requests.
     */
    if (user.role === "doctor") {
      filter = {
        doctorId: user.id,
      };
    }

    /*
     * Admin, nurse and lab technician can
     * view all lab requests.
     */
    const requests =
      await LabRequest.find(filter).sort({
        createdAt: -1,
      });

    return res.status(200).json(requests);
  } catch (error) {
    console.error(
      "Error fetching lab requests:",
      error,
    );

    return res.status(500).json({
      message: "Failed to fetch lab requests",
    });
  }
};

/*
 * Get one lab request.
 *
 * Admin:
 *   - Can view any request.
 *
 * Doctor:
 *   - Can view only their own requests.
 *
 * Nurse / Lab Technician:
 *   - Can view any request.
 *
 * Patient:
 *   - Not allowed.
 */
export const getLabRequestById = async (
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

    /*
     * Controller-level role protection.
     */
    if (
      !hasRole(user, [
        "admin",
        "doctor",
        "nurse",
        "lab_tech",
      ])
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Insufficient Permissions",
      });
    }

    const request =
      await LabRequest.findById(
        req.params.id,
      );

    if (!request) {
      return res.status(404).json({
        message: "Lab request not found",
      });
    }

    /*
     * Doctors can only view their own requests.
     */
    if (
      user.role === "doctor" &&
      request.doctorId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only view your own lab requests",
      });
    }

    return res.status(200).json(request);
  } catch (error) {
    console.error(
      "Error fetching lab request:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to fetch lab request",
    });
  }
};

/*
 * Create a lab request.
 *
 * Allowed:
 *   - admin
 *   - doctor
 *
 * Doctors:
 *   - Can only create using their own doctor ID.
 *
 * Patients, nurses and lab technicians:
 *   - Not allowed.
 */
export const createLabRequest = async (
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

    /*
     * Only admin and doctor can create
     * lab requests.
     */
    if (
      !hasRole(user, [
        "admin",
        "doctor",
      ])
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Only doctors and administrators can create lab requests",
      });
    }

    const {
      patientId,
      doctorId,
      testName,
      testType,
      priority,
      notes,
    } = req.body;

    /*
     * Required fields.
     */
    if (
      !patientId ||
      !doctorId ||
      !testName ||
      !testType
    ) {
      return res.status(400).json({
        message:
          "Patient, doctor, test name, and test type are required",
      });
    }

    /*
     * Doctors can only create requests
     * using their own doctor ID.
     */
    if (
      user.role === "doctor" &&
      doctorId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Doctors can only create lab requests for themselves",
      });
    }

    /*
     * Validate priority.
     */
    const requestPriority =
      priority || "normal";

    if (
      !["normal", "urgent"].includes(
        requestPriority,
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid priority. Use normal or urgent",
      });
    }

    /*
     * Status is intentionally not accepted
     * from the client.
     *
     * Every new request starts as "requested".
     */
    const labRequest =
      await LabRequest.create({
        patientId,
        doctorId,
        testName,
        testType,
        priority: requestPriority,
        notes,
        status: "requested",
      });

    return res.status(201).json(
      labRequest,
    );
  } catch (error) {
    console.error(
      "Error creating lab request:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to create lab request",
    });
  }
};

/*
 * Update a lab request.
 *
 * Admin:
 *   - Can update operational fields.
 *
 * Doctor:
 *   - Can update their own request.
 *   - Cannot change patient/doctor ownership.
 *
 * Lab Technician:
 *   - Can update status only.
 *
 * Patients / Nurses:
 *   - Not allowed.
 */
export const updateLabRequest = async (
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

    /*
     * Only admin, doctor and lab technician
     * can update lab requests.
     */
    if (
      !hasRole(user, [
        "admin",
        "doctor",
        "lab_tech",
      ])
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Insufficient Permissions",
      });
    }

    const existingRequest =
      await LabRequest.findById(
        req.params.id,
      );

    if (!existingRequest) {
      return res.status(404).json({
        message: "Lab request not found",
      });
    }

    /*
     * Doctors can only update requests
     * belonging to them.
     */
    if (
      user.role === "doctor" &&
      existingRequest.doctorId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only update your own lab requests",
      });
    }

    /*
     * Validate status if supplied.
     */
    if (req.body.status !== undefined) {
      const allowedStatuses = [
        "requested",
        "processing",
        "completed",
        "cancelled",
      ];

      if (
        !allowedStatuses.includes(
          req.body.status,
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid lab request status",
        });
      }
    }

    const updateData: Record<
      string,
      unknown
    > = {};

    /*
     * Lab technicians can ONLY update status.
     */
    if (user.role === "lab_tech") {
      if (
        req.body.status === undefined
      ) {
        return res.status(400).json({
          message:
            "Lab technicians can only update the request status",
        });
      }

      updateData.status =
        req.body.status;
    } else {
      /*
       * Admin and doctor can update
       * operational fields.
       *
       * Ownership fields are intentionally
       * excluded.
       */
      const allowedFields = [
        "testName",
        "testType",
        "priority",
        "notes",
        "status",
      ];

      for (const field of allowedFields) {
        if (
          req.body[field] !== undefined &&
          req.body[field] !== null
        ) {
          updateData[field] =
            req.body[field];
        }
      }

      /*
       * Validate priority if it is being changed.
       */
      if (
        updateData.priority !==
          undefined &&
        !["normal", "urgent"].includes(
          updateData.priority as string,
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid priority. Use normal or urgent",
        });
      }
    }

    /*
     * Never allow ownership changes.
     *
     * patientId and doctorId are intentionally
     * not included in updateData.
     */
    if (
      Object.keys(updateData).length === 0
    ) {
      return res.status(400).json({
        message:
          "No valid fields provided for update",
      });
    }

    const labRequest =
      await LabRequest.findByIdAndUpdate(
        req.params.id,
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (!labRequest) {
      return res.status(404).json({
        message: "Lab request not found",
      });
    }

    return res.status(200).json(
      labRequest,
    );
  } catch (error) {
    console.error(
      "Error updating lab request:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to update lab request",
    });
  }
};

/*
 * Delete a lab request.
 *
 * Allowed:
 *   - admin
 *   - doctor
 *
 * Doctors:
 *   - Can delete only their own requests.
 *
 * Patients, nurses and lab technicians:
 *   - Not allowed.
 */
export const deleteLabRequest = async (
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

    /*
     * Only admin and doctor can delete
     * lab requests.
     */
    if (
      !hasRole(user, [
        "admin",
        "doctor",
      ])
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Only doctors and administrators can delete lab requests",
      });
    }

    const existingRequest =
      await LabRequest.findById(
        req.params.id,
      );

    if (!existingRequest) {
      return res.status(404).json({
        message: "Lab request not found",
      });
    }

    /*
     * Doctors can only delete their own requests.
     */
    if (
      user.role === "doctor" &&
      existingRequest.doctorId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only delete your own lab requests",
      });
    }

    await LabRequest.findByIdAndDelete(
      req.params.id,
    );

    return res.status(200).json({
      message:
        "Lab request deleted successfully",
    });
  } catch (error) {
    console.error(
      "Error deleting lab request:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to delete lab request",
    });
  }
};