import type { Request, Response } from "express";
import ActivityLog from "../models/activityLog";
import { logActivity } from "../lib/activity";
import mongoose from "mongoose";

// Controller to add an activity log
export const addActivityLog = async (
  req: Request,
  res: Response,
) => {
  try {
    const currentUser = (req as any).user;
    const { action, details } = req.body;

    if (!currentUser?.id) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!action || typeof action !== "string") {
      return res.status(400).json({
        message: "Action is required",
      });
    }

    await logActivity(
      currentUser.id,
      action,
      details,
    );

    res.status(201).json({
      message: "Activity logged successfully",
    });
  } catch (error) {
    console.error(
      "Error adding activity log:",
      error,
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Controller to fetch activity logs
export const getActivityLogs = async (
  req: Request,
  res: Response,
) => {
  try {
    // Parse pagination parameters.
    const page = Math.max(
      1,
      parseInt(req.query.page as string) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        parseInt(req.query.limit as string) || 10,
      ),
    );

    const skip = (page - 1) * limit;

    // Fetch activity logs.
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination.
    const totalLogs =
      await ActivityLog.countDocuments();

    /*
     * Fetch only the user fields required by
     * the activity-log UI.
     *
     * Sensitive Better Auth fields such as password,
     * headers, sessions, verification data, etc.
     * must not be returned.
     */
    const collection =
      mongoose.connection.collection("user");

    const users = await collection
      .find(
        {},
        {
          projection: {
            name: 1,
            email: 1,
            image: 1,
            role: 1,
            status: 1,
            department: 1,
            specialization: 1,
          },
        },
      )
      .toArray();

    // Create a map of user ID to safe user details.
    const userMap = new Map<string, any>();

    users.forEach((user) => {
      userMap.set(
        user._id.toString(),
        user,
      );
    });

    // Attach safe user details to each log.
    const logsWithUserDetails = logs.map(
      (log) => {
        const user = userMap.get(
          log.user.toString(),
        );

        return {
          ...log,
          user: user || null,
        };
      },
    );

    // Calculate total pages.
    const totalPages = Math.ceil(
      totalLogs / limit,
    );

    res.json({
      res: logsWithUserDetails,
      pagination: {
        currentPage: page,
        totalPages,
        totalData: totalLogs,
        limit,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching activity logs:",
      error,
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};