import type { Request, Response } from "express";
import Settings from "../models/settings";

const isValidNumber = (value: unknown) => {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
};

export const getSettings = async (
  _req: Request,
  res: Response,
) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({
        hospitalName: "MedFlow AI Hospital",
        hospitalEmail: "",
        hospitalPhone: "",
        hospitalAddress: "",
        timezone: "Asia/Kolkata",
        currency: "INR",
        dateFormat: "DD/MM/YYYY",

        // Billing defaults
        taxEnabled: false,
        taxPercentage: 0,
        consultationFee: 0,
        xrayFee: 15000,
        laboratoryFee: 0,
        pharmacyFee: 0,
        paymentProvider: "polar",
        paymentMode: "sandbox",
        autoGenerateInvoice: true,
      });
    }

    return res.status(200).json(settings);
  } catch (error) {
    console.error(
      "Error fetching settings:",
      error,
    );

    return res.status(500).json({
      message: "Failed to fetch settings",
    });
  }
};

export const updateSettings = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      hospitalName,
      hospitalEmail,
      hospitalPhone,
      hospitalAddress,
      timezone,
      currency,
      dateFormat,

      // Billing settings
      taxEnabled,
      taxPercentage,
      consultationFee,
      xrayFee,
      laboratoryFee,
      pharmacyFee,
      paymentProvider,
      paymentMode,
      autoGenerateInvoice,
    } = req.body;

    /*
     * Load existing settings first.
     *
     * This is important because General Settings
     * and Billing Settings are saved independently.
     */
    let existingSettings = await Settings.findOne();

    if (!existingSettings) {
      existingSettings = await Settings.create({
        hospitalName: "MedFlow AI Hospital",
        hospitalEmail: "",
        hospitalPhone: "",
        hospitalAddress: "",
        timezone: "Asia/Kolkata",
        currency: "INR",
        dateFormat: "DD/MM/YYYY",

        taxEnabled: false,
        taxPercentage: 0,
        consultationFee: 0,
        xrayFee: 15000,
        laboratoryFee: 0,
        pharmacyFee: 0,
        paymentProvider: "polar",
        paymentMode: "sandbox",
        autoGenerateInvoice: true,
      });
    }

    const updateData: Record<string, unknown> = {};

    /*
     * --------------------------------------------------
     * General Settings
     * --------------------------------------------------
     */

    if (hospitalName !== undefined) {
      if (
        typeof hospitalName !== "string" ||
        !hospitalName.trim()
      ) {
        return res.status(400).json({
          message: "Hospital name is required",
        });
      }

      updateData.hospitalName =
        hospitalName.trim();
    }

    if (hospitalEmail !== undefined) {
      updateData.hospitalEmail =
        typeof hospitalEmail === "string"
          ? hospitalEmail.trim()
          : hospitalEmail;
    }

    if (hospitalPhone !== undefined) {
      updateData.hospitalPhone =
        typeof hospitalPhone === "string"
          ? hospitalPhone.trim()
          : hospitalPhone;
    }

    if (hospitalAddress !== undefined) {
      updateData.hospitalAddress =
        typeof hospitalAddress === "string"
          ? hospitalAddress.trim()
          : hospitalAddress;
    }

    if (timezone !== undefined) {
      updateData.timezone =
        typeof timezone === "string"
          ? timezone.trim()
          : timezone;
    }

    if (currency !== undefined) {
      updateData.currency =
        typeof currency === "string"
          ? currency.trim()
          : currency;
    }

    if (dateFormat !== undefined) {
      updateData.dateFormat =
        typeof dateFormat === "string"
          ? dateFormat.trim()
          : dateFormat;
    }

    /*
     * --------------------------------------------------
     * Billing Settings
     * --------------------------------------------------
     */

    if (taxEnabled !== undefined) {
      updateData.taxEnabled =
        Boolean(taxEnabled);
    }

    if (taxPercentage !== undefined) {
      if (!isValidNumber(taxPercentage)) {
        return res.status(400).json({
          message:
            "Tax percentage must be a valid number",
        });
      }

      const tax = Number(taxPercentage);

      if (tax < 0 || tax > 100) {
        return res.status(400).json({
          message:
            "Tax percentage must be between 0 and 100",
        });
      }

      updateData.taxPercentage = tax;
    }

    const feeFields = [
      "consultationFee",
      "xrayFee",
      "laboratoryFee",
      "pharmacyFee",
    ] as const;

    for (const field of feeFields) {
      if (req.body[field] !== undefined) {
        if (!isValidNumber(req.body[field])) {
          return res.status(400).json({
            message:
              `${field} must be a valid number`,
          });
        }

        const fee = Number(req.body[field]);

        if (fee < 0) {
          return res.status(400).json({
            message:
              `${field} cannot be negative`,
          });
        }

        updateData[field] = fee;
      }
    }

    if (paymentProvider !== undefined) {
      if (paymentProvider !== "polar") {
        return res.status(400).json({
          message:
            "Invalid payment provider",
        });
      }

      updateData.paymentProvider =
        paymentProvider;
    }

    if (paymentMode !== undefined) {
      if (
        paymentMode !== "sandbox" &&
        paymentMode !== "production"
      ) {
        return res.status(400).json({
          message: "Invalid payment mode",
        });
      }

      updateData.paymentMode =
        paymentMode;
    }

    if (autoGenerateInvoice !== undefined) {
      updateData.autoGenerateInvoice =
        Boolean(autoGenerateInvoice);
    }

    /*
     * Nothing to update.
     */
    if (
      Object.keys(updateData).length === 0
    ) {
      return res.status(400).json({
        message:
          "No valid settings provided for update",
      });
    }

    /*
     * Update only the fields actually supplied
     * by the frontend.
     *
     * This prevents General Settings from resetting
     * Billing Settings and vice versa.
     */
    const settings =
      await Settings.findOneAndUpdate(
        { _id: existingSettings._id },
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (!settings) {
      return res.status(404).json({
        message: "Settings not found",
      });
    }

    return res.status(200).json(settings);
  } catch (error) {
    console.error(
      "Error updating settings:",
      error,
    );

    return res.status(500).json({
      message: "Failed to update settings",
    });
  }
};