import type { Request, Response } from "express";
import SupportTicket from "../models/supportTicket";

const getCurrentUser = (req: Request) => {
  return (req as any).user;
};

const validCategories = [
  "technical",
  "billing",
  "account",
  "medical",
  "other",
] as const;

const validPriorities = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

const validStatuses = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;

const isAdmin = (user: any) => user?.role === "admin";

export const getSupportTickets = async (
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

    const tickets = await SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(tickets);
  } catch (error) {
    console.error("Get support tickets error:", error);

    return res.status(500).json({
      message: "Failed to fetch support tickets",
    });
  }
};

export const getSupportTicketById = async (
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

    const ticket = await SupportTicket.findById(req.params.id).lean();

    if (!ticket) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

    if (!isAdmin(user) && ticket.userId !== String(user.id)) {
      return res.status(403).json({
        message: "You are not allowed to view this ticket",
      });
    }

    return res.status(200).json(ticket);
  } catch (error) {
    console.error("Get support ticket error:", error);

    return res.status(500).json({
      message: "Failed to fetch support ticket",
    });
  }
};

export const createSupportTicket = async (
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
      subject,
      category,
      description,
      priority,
    } = req.body;

    if (
      typeof subject !== "string" ||
      !subject.trim()
    ) {
      return res.status(400).json({
        message: "Subject is required",
      });
    }

    if (
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        message: "Description is required",
      });
    }

    if (
      !validCategories.includes(category)
    ) {
      return res.status(400).json({
        message: "Invalid support category",
      });
    }

    const ticketPriority =
      priority ?? "medium";

    if (
      !validPriorities.includes(ticketPriority)
    ) {
      return res.status(400).json({
        message: "Invalid support priority",
      });
    }

    const ticket = await SupportTicket.create({
      userId: String(user.id),
      subject: subject.trim(),
      category,
      description: description.trim(),
      priority: ticketPriority,
      status: "open",
    });

    return res.status(201).json(ticket);
  } catch (error) {
    console.error("Create support ticket error:", error);

    return res.status(500).json({
      message: "Failed to create support ticket",
    });
  }
};

export const updateSupportTicket = async (
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

    if (!isAdmin(user)) {
      return res.status(403).json({
        message: "Only administrators can update support tickets",
      });
    }

    const ticket = await SupportTicket.findById(
      req.params.id,
    );

    if (!ticket) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

    const {
      status,
      priority,
      adminResponse,
    } = req.body;

    if (
      status !== undefined &&
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid support ticket status",
      });
    }

    if (
      priority !== undefined &&
      !validPriorities.includes(priority)
    ) {
      return res.status(400).json({
        message: "Invalid support ticket priority",
      });
    }

    if (status !== undefined) {
      ticket.status = status;
    }

    if (priority !== undefined) {
      ticket.priority = priority;
    }

    if (adminResponse !== undefined) {
      if (
        typeof adminResponse !== "string"
      ) {
        return res.status(400).json({
          message: "Admin response must be a string",
        });
      }

      ticket.adminResponse =
        adminResponse.trim();
    }

    await ticket.save();

    return res.status(200).json(ticket);
  } catch (error) {
    console.error("Update support ticket error:", error);

    return res.status(500).json({
      message: "Failed to update support ticket",
    });
  }
};

export const deleteSupportTicket = async (
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

    const ticket = await SupportTicket.findById(
      req.params.id,
    );

    if (!ticket) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

    if (
      !isAdmin(user) &&
      ticket.userId !== String(user.id)
    ) {
      return res.status(403).json({
        message: "You are not allowed to delete this ticket",
      });
    }

    await SupportTicket.findByIdAndDelete(
      req.params.id,
    );

    return res.status(200).json({
      message: "Support ticket deleted successfully",
    });
  } catch (error) {
    console.error("Delete support ticket error:", error);

    return res.status(500).json({
      message: "Failed to delete support ticket",
    });
  }
};