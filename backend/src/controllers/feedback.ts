import type { Request, Response } from "express";
import Feedback from "../models/feedback";

const getCurrentUser = (req: Request) => {
  return (req as any).user;
};

const validCategories = [
  "service",
  "doctor",
  "nursing",
  "pharmacy",
  "laboratory",
  "technical",
  "other",
] as const;

const isAdmin = (user: any) => user?.role === "admin";

export const getFeedback = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const filter = isAdmin(user)
      ? {}
      : { userId: String(user.id) };

    const feedback = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(feedback);
  } catch (error) {
    console.error("Get feedback error:", error);

    return res.status(500).json({
      message: "Failed to fetch feedback",
    });
  }
};

export const getFeedbackById = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const feedback = await Feedback.findById(
      req.params.id,
    ).lean();

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found",
      });
    }

    if (
      !isAdmin(user) &&
      feedback.userId !== String(user.id)
    ) {
      return res.status(403).json({
        message: "You are not allowed to view this feedback",
      });
    }

    return res.status(200).json(feedback);
  } catch (error) {
    console.error("Get feedback by ID error:", error);

    return res.status(500).json({
      message: "Failed to fetch feedback",
    });
  }
};

export const createFeedback = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const {
      rating,
      category,
      message,
    } = req.body;

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be an integer between 1 and 5",
      });
    }

    if (
      !validCategories.includes(category)
    ) {
      return res.status(400).json({
        message: "Invalid feedback category",
      });
    }

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        message: "Feedback message is required",
      });
    }

    const feedback = await Feedback.create({
      userId: String(user.id),
      rating: numericRating,
      category,
      message: message.trim(),
    });

    return res.status(201).json(feedback);
  } catch (error) {
    console.error("Create feedback error:", error);

    return res.status(500).json({
      message: "Failed to create feedback",
    });
  }
};

export const updateFeedback = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const feedback = await Feedback.findById(
      req.params.id,
    );

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found",
      });
    }

    if (
      !isAdmin(user) &&
      feedback.userId !== String(user.id)
    ) {
      return res.status(403).json({
        message: "You are not allowed to update this feedback",
      });
    }

    const {
      rating,
      category,
      message,
    } = req.body;

    if (rating !== undefined) {
      const numericRating = Number(rating);

      if (
        !Number.isInteger(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res.status(400).json({
          message: "Rating must be an integer between 1 and 5",
        });
      }

      feedback.rating = numericRating;
    }

    if (category !== undefined) {
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          message: "Invalid feedback category",
        });
      }

      feedback.category = category;
    }

    if (message !== undefined) {
      if (
        typeof message !== "string" ||
        !message.trim()
      ) {
        return res.status(400).json({
          message: "Feedback message cannot be empty",
        });
      }

      feedback.message = message.trim();
    }

    await feedback.save();

    return res.status(200).json(feedback);
  } catch (error) {
    console.error("Update feedback error:", error);

    return res.status(500).json({
      message: "Failed to update feedback",
    });
  }
};

export const deleteFeedback = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const feedback = await Feedback.findById(
      req.params.id,
    );

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found",
      });
    }

    if (
      !isAdmin(user) &&
      feedback.userId !== String(user.id)
    ) {
      return res.status(403).json({
        message: "You are not allowed to delete this feedback",
      });
    }

    await Feedback.findByIdAndDelete(
      req.params.id,
    );

    return res.status(200).json({
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    console.error("Delete feedback error:", error);

    return res.status(500).json({
      message: "Failed to delete feedback",
    });
  }
};