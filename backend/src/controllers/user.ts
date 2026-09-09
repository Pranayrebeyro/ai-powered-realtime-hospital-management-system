import mongoose from "mongoose";
import type { Request, Response } from "express";
import { logActivity } from "../lib/activity";
import { inngest } from "../inngest/client";
import { polarClient } from "../lib/auth";

const getCurrentUser = (req: Request) => {
  return (req as any).user;
};

/*
 * Express can type route parameters as:
 * string | string[] | undefined
 *
 * Normalize the value before using it.
 */
const normalizeId = (
  value: unknown,
): string | null => {
  if (typeof value !== "string" || !value) {
    return null;
  }

  return value;
};

const getUserObjectId = (
  id: string,
) => {
  return mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;
};

const getUserCollection = () => {
  return mongoose.connection.collection("user");
};

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

/*
 * Get a user's profile.
 *
 * Patients:
 * - Can only view their own profile.
 *
 * Admin / medical staff:
 * - Can view user profiles.
 */
export const getUserById = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = normalizeId(req.params.id);
    const currentUser = getCurrentUser(req);

    if (!currentUser?.id || !currentUser?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!id) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    if (
      currentUser.role === "patient" &&
      currentUser.id !== id
    ) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const collection = getUserCollection();

    const user = await collection.findOne(
      {
        _id: getUserObjectId(id) as any,
      },
      {
        projection: {
          password: 0,
          headers: 0,
        },
      },
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(
      "Error fetching user:",
      error,
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/*
 * Get doctors for appointment and
 * telemedicine selection.
 *
 * This endpoint is intentionally separate
 * from the general users endpoint.
 *
 * Security:
 * - Requires authentication.
 * - Does not expose patients.
 * - Does not expose passwords or headers.
 * - Returns only safe doctor fields.
 */
export const getDoctors = async (
  req: Request,
  res: Response,
) => {
  try {
    const currentUser = getCurrentUser(req);

    if (!currentUser?.id || !currentUser?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const collection = getUserCollection();

    const doctors = await collection
      .find(
        {
          role: "doctor",
        },
        {
          projection: {
            _id: 1,
            name: 1,
            specialization: 1,
            department: 1,
            image: 1,
          },
        },
      )
      .sort({
        name: 1,
      })
      .toArray();

    return res.status(200).json(doctors);
  } catch (error) {
    console.error(
      "Error fetching doctors:",
      error,
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/*
 * Update user profile.
 *
 * Admin:
 * - Can update allowed profile fields.
 *
 * Doctor / Nurse:
 * - Can update allowed fields only for patients.
 *
 * Role, email and password are intentionally
 * excluded from this endpoint.
 */
export const updateUser = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = normalizeId(req.params.id);
    const currentUser = getCurrentUser(req);

    if (!currentUser?.id || !currentUser?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!id) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const collection = getUserCollection();

    const existingUser = await collection.findOne({
      _id: getUserObjectId(id) as any,
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    /*
     * Doctors and nurses can only update
     * patient profiles.
     */
    if (
      ["doctor", "nurse"].includes(
        currentUser.role,
      ) &&
      existingUser.role !== "patient"
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Medical staff can only update patient profiles",
      });
    }

    /*
     * Only these fields can be modified.
     *
     * Security-sensitive fields such as:
     * - role
     * - email
     * - password
     *
     * are intentionally excluded.
     */
    const allowedFields = [
      "name",
      "status",
      "specialization",
      "department",
      "age",
      "gender",
      "bloodgroup",
      "medicalHistory",
    ];

    const updatePayload: Record<
      string,
      unknown
    > = {};

    for (const field of allowedFields) {
      if (
        req.body[field] !== undefined &&
        req.body[field] !== null
      ) {
        updatePayload[field] =
          req.body[field];
      }
    }

    if (
      Object.keys(updatePayload).length === 0
    ) {
      return res.status(400).json({
        message:
          "No valid fields provided for update",
      });
    }

    const result = await collection.updateOne(
      {
        _id: getUserObjectId(id) as any,
      },
      {
        $set: updatePayload,
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    /*
     * Notify connected clients that a user changed.
     */
    const io = req.app.get("io");

    if (
      io &&
      result.modifiedCount > 0
    ) {
      io.emit("notify_user_updated");
    }

    /*
     * Activity log.
     */
    await logActivity(
      currentUser.id,
      "Updated User",
      `User updated: ${id}`,
    );

    return res.status(200).json({
      message:
        "User updated successfully",
      updatedUser: result,
    });
  } catch (error) {
    console.error(
      "Error updating user:",
      error,
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/*
 * Fetch users with pagination and
 * optional role filtering.
 *
 * Route protection:
 * admin / doctor / nurse
 *
 * Pagination:
 * - Default: 10
 * - Minimum: 1
 * - Maximum: 100
 */
export const fetchAllUsers = async (
  req: Request,
  res: Response,
) => {
  try {
    const page = Math.max(
      1,
      parseInt(
        req.query.page as string,
      ) || 1,
    );

    /*
     * Prevent clients from requesting an
     * excessively large number of users.
     */
    const requestedLimit = parseInt(
      req.query.limit as string,
    );

const limit = Math.min(
  100,
  Math.max(
    1,
    Number.isNaN(requestedLimit)
      ? 10
      : requestedLimit,
  ),
);

    const skip = (page - 1) * limit;

    const filter: Record<
      string,
      unknown
    > = {};

    const role =
      req.query.role as string;

    if (
      role &&
      role !== "all" &&
      role !== ""
    ) {
      filter.role = role;
    }

    const collection =
      getUserCollection();

    const totalUsers =
      await collection.countDocuments(
        filter,
      );

    const users = await collection
      .find(filter, {
        projection: {
          password: 0,
          headers: 0,
          emailVerified: 0,
        },
      })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .toArray();

    return res.status(200).json({
      res: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(
          totalUsers / limit,
        ),
        totalData: totalUsers,
        limit,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching users:",
      error,
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/*
 * Admit a patient.
 */
export const admitPatient = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = normalizeId(
      req.params.id,
    );

    const { admissionReason } =
      req.body;

    const currentUser =
      getCurrentUser(req);

    if (
      !currentUser?.id ||
      !currentUser?.role
    ) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!id) {
      return res.status(400).json({
        message: "Patient ID is required",
      });
    }

    /*
     * Verify that the target user is
     * actually a patient.
     */
    const patientExists =
      await userHasRole(
        id,
        "patient",
      );

    if (!patientExists) {
      return res.status(404).json({
        message: "Patient not found",
      });
    }

    /*
     * Trigger admission workflow.
     */
    await inngest.send({
      name: "patient/admitted",
      data: {
        patientId: id,
        admissionReason,
      },
    });

    /*
     * Log who admitted the patient.
     */
    await logActivity(
      currentUser.id,
      "Admitted Patient",
      `Admitted patient ${id}`,
    );

    return res.status(200).json({
      message:
        "Patient admission requested successfully",
    });
  } catch (error) {
    console.error(
      "Error admitting patient:",
      error,
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/*
 * Get Polar customer portal link.
 *
 * Users:
 * - Can access their own portal.
 *
 * Admin:
 * - Can access any customer's portal.
 */
export const getPolarPortalLink = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = normalizeId(
      req.params.userId,
    );

    const currentUser =
      getCurrentUser(req);

    if (
      !currentUser?.id ||
      !currentUser?.role
    ) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    /*
     * Only admins can access another
     * user's billing portal.
     */
    if (
      currentUser.role !== "admin" &&
      currentUser.id !== userId
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only access your own billing portal",
      });
    }

    const result =
      await polarClient.customerSessions.create(
        {
          externalCustomerId: userId,
        },
      );

    return res.status(200).json({
      polarPortalUrl:
        result.customerPortalUrl,
    });
  } catch (error) {
    console.error(
      "Error fetching Polar portal link:",
      error,
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};