import type { Request, Response } from "express";
import invoice from "../models/invoice";
import mongoose from "mongoose";
import { polarClient } from "../lib/auth";

export const getMyActiveInvoice = async (
  req: Request,
  res: Response,
) => {
  try {
    const currentUserId = (req as any).user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const activeInvoice = await invoice.findOne({
      patientId: currentUserId,
      status: {
        $in: ["draft", "pending_payment"],
      },
    });

    if (!activeInvoice) {
      return res.status(404).json({
        message: "No active invoice found",
      });
    }

    res.status(200).json(activeInvoice);
  } catch (error) {
    console.error(
      "Error fetching active invoice:",
      error,
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Get billing history for the authenticated patient.
export const getBillingHistory = async (
  req: Request,
  res: Response,
) => {
  try {
    const currentUserId = (req as any).user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const billingHistory = await invoice
      .find({
        patientId: currentUserId,
        status: "paid",
      })
      .sort({ createdAt: -1 });

    res.status(200).json(billingHistory);
  } catch (error) {
    console.error(
      "Error fetching billing history:",
      error,
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Get all billing records.
// Admin only through the route middleware.
export const allBilling = async (
  req: Request,
  res: Response,
) => {
  try {
    const page = Math.max(
      1,
      Number(req.query.page) || 1,
    );

    const limit = Math.max(
      1,
      Number(req.query.limit) || 10,
    );

    const skip = (page - 1) * limit;

    const billings = await invoice
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await invoice.countDocuments();

    const collection =
      mongoose.connection.collection("user");

    const users = await collection.find(
      {
        role: "patient",
      },
      {
        projection: {
          password: 0,
          headers: 0,
          emailVerified: 0,
        },
      },
    ).toArray();

    const userMap = new Map<string, any>();

    users.forEach((user) => {
      userMap.set(
        user._id.toString(),
        user,
      );
    });

    const billingsWithUser = billings.map(
      (billing) => {
        const user = userMap.get(
          billing.patientId.toString(),
        );

        return {
          ...billing,
          user: user || null,
        };
      },
    );

    res.json({
      res: billingsWithUser,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(
          count / limit,
        ),
        totalData: count,
        limit,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching billing history:",
      error,
    );

    res.status(500).json({
      message:
        "Failed to fetch billing history",
    });
  }
};

// Create Polar checkout session.
export const createCheckoutSession = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const currentUserId = (req as any).user?.id;
    const currentUserRole = (req as any).user?.role;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!id) {
      return res.status(400).json({
        message: "Invoice ID is required",
      });
    }

    const userInvoice =
      await invoice.findById(id);

    if (
      !userInvoice ||
      userInvoice.status === "paid"
    ) {
      return res.status(400).json({
        message:
          "Invalid or already paid invoice",
      });
    }

    /*
     * Patients can only pay their own invoices.
     *
     * Admins can create a checkout for an invoice
     * when necessary from the admin billing system.
     */
    if (
      currentUserRole !== "admin" &&
      userInvoice.patientId !== currentUserId
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only pay your own invoice",
      });
    }

    if (!process.env.POLAR_PRODUCT_ID) {
      return res.status(500).json({
        message:
          "Polar product configuration is missing",
      });
    }

    if (!process.env.FRONTEND_URL) {
      return res.status(500).json({
        message:
          "Frontend URL configuration is missing",
      });
    }

    const checkout =
      await polarClient.checkouts.create({
        externalCustomerId:
          userInvoice.patientId,

        products: [
          process.env.POLAR_PRODUCT_ID,
        ],

        prices: {
          [process.env.POLAR_PRODUCT_ID]: [
            {
              amountType: "fixed",
              priceAmount:
                userInvoice.totalAmount,
              priceCurrency: "usd",
            },
          ],
        },

        metadata: {
          hospitalInvoiceId:
            userInvoice._id.toString(),
          patientId:
            userInvoice.patientId,
        },

        successUrl:
          `${process.env.FRONTEND_URL}/profile/${userInvoice.patientId}` +
          `?checkout_id={CHECKOUT_ID}`,

        returnUrl:
          `${process.env.FRONTEND_URL}/profile/${userInvoice.patientId}`,
      });

    userInvoice.status =
      "pending_payment";

    userInvoice.polarCheckoutId =
      checkout.id;

    await userInvoice.save();

    res.json({
      checkoutUrl: checkout.url,
    });
  } catch (error) {
    console.error(
      "Polar Checkout Error:",
      error,
    );

    res.status(500).json({
      error:
        "Failed to generate payment link",
    });
  }
};