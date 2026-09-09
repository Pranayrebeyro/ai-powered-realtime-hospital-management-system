import type { Request, Response } from "express";
import Prescription from "../models/prescription";
import Medicine from "../models/medicine";

const getCurrentUser = (req: Request) => {
  return (req as any).user;
};

const hasRole = (
  user: any,
  allowedRoles: string[],
) => {
  return !!user?.role && allowedRoles.includes(user.role);
};

const recalculateMedicineStatus = async (
  medicineId: string,
) => {
  const medicine =
    await Medicine.findById(medicineId);

  if (!medicine) {
    return;
  }

  let status:
    | "available"
    | "low_stock"
    | "out_of_stock"
    | "expired";

  if (
    medicine.expiryDate &&
    new Date(medicine.expiryDate) < new Date()
  ) {
    status = "expired";
  } else if (medicine.quantity === 0) {
    status = "out_of_stock";
  } else if (
    medicine.quantity <= medicine.reorderLevel
  ) {
    status = "low_stock";
  } else {
    status = "available";
  }

  medicine.status = status;

  await medicine.save();
};

/*
 * Get all prescriptions available to the current user.
 *
 * Patient:
 *   - Can only see their own prescriptions.
 *
 * Doctor:
 *   - Can only see prescriptions they created.
 *
 * Pharmacist/Admin:
 *   - Can see all prescriptions.
 */
export const getPrescriptions = async (
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

    if (
      !hasRole(user, [
        "admin",
        "doctor",
        "pharmacist",
        "patient",
      ])
    ) {
      return res.status(403).json({
        message: "Forbidden: Insufficient Permissions",
      });
    }

    let filter: Record<string, unknown> = {};

    if (user.role === "patient") {
      filter = {
        patientId: user.id,
      };
    } else if (user.role === "doctor") {
      filter = {
        doctorId: user.id,
      };
    }

    const prescriptions =
      await Prescription.find(filter).sort({
        createdAt: -1,
      });

    return res.status(200).json(
      prescriptions,
    );
  } catch (error) {
    console.error(
      "Error fetching prescriptions:",
      error,
    );

    return res.status(500).json({
      message: "Failed to fetch prescriptions",
    });
  }
};

/*
 * Get one prescription.
 *
 * Patient:
 *   - Own prescriptions only.
 *
 * Doctor:
 *   - Prescriptions they created only.
 *
 * Pharmacist/Admin:
 *   - Any prescription.
 */
export const getPrescriptionById = async (
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

    if (
      !hasRole(user, [
        "admin",
        "doctor",
        "pharmacist",
        "patient",
      ])
    ) {
      return res.status(403).json({
        message: "Forbidden: Insufficient Permissions",
      });
    }

    const prescription =
      await Prescription.findById(
        req.params.id,
      );

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found",
      });
    }

    /*
     * Patients can only access their own prescriptions.
     */
    if (
      user.role === "patient" &&
      prescription.patientId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only access your own prescriptions",
      });
    }

    /*
     * Doctors can only access prescriptions they created.
     */
    if (
      user.role === "doctor" &&
      prescription.doctorId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only access your own prescriptions",
      });
    }

    return res.status(200).json(
      prescription,
    );
  } catch (error) {
    console.error(
      "Error fetching prescription:",
      error,
    );

    return res.status(500).json({
      message: "Failed to fetch prescription",
    });
  }
};

/*
 * Create prescription.
 *
 * Allowed:
 *   - admin
 *   - doctor
 *
 * Doctors must use their own doctorId.
 *
 * Patients and pharmacists cannot create
 * prescriptions.
 */
export const createPrescription = async (
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

    if (
      !hasRole(user, [
        "admin",
        "doctor",
      ])
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Only doctors and administrators can create prescriptions",
      });
    }

    const {
      patientId,
      doctorId,
      medicines,
      instructions,
    } = req.body;

    if (
      !patientId ||
      !doctorId ||
      !medicines?.length
    ) {
      return res.status(400).json({
        message:
          "Patient, doctor, and at least one medicine are required",
      });
    }

    /*
     * Doctors can only create prescriptions
     * using their own doctor ID.
     */
    if (
      user.role === "doctor" &&
      doctorId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Doctors can only create prescriptions for themselves",
      });
    }

    /*
     * Verify every medicine before changing stock.
     *
     * IMPORTANT:
     * Creating a prescription does NOT deduct
     * inventory. Inventory is deducted only
     * when the prescription is dispensed.
     */
    for (const prescribedMedicine of medicines) {
      const {
        medicineId,
        quantity,
        medicineName,
        dosage,
        frequency,
        duration,
      } = prescribedMedicine;

      if (
        !medicineId ||
        !quantity ||
        quantity < 1 ||
        !medicineName ||
        !dosage ||
        !frequency ||
        !duration
      ) {
        return res.status(400).json({
          message:
            "Each medicine must have a valid medicine ID, name, dosage, frequency, duration, and quantity",
        });
      }

      const medicine =
        await Medicine.findById(
          medicineId,
        );

      if (!medicine) {
        return res.status(404).json({
          message:
            `Medicine not found: ${medicineId}`,
        });
      }

      if (medicine.quantity < quantity) {
        return res.status(400).json({
          message:
            `Insufficient stock for ${medicine.name}. Available: ${medicine.quantity}`,
        });
      }

      if (
        medicine.status === "expired" ||
        medicine.status === "out_of_stock"
      ) {
        return res.status(400).json({
          message:
            `${medicine.name} is not available for dispensing`,
        });
      }
    }

    /*
     * Create prescription.
     */
    const prescription =
      await Prescription.create({
        patientId,
        doctorId,
        medicines,
        instructions,
      });

    /*
     * Recalculate medicine status.
     *
     * No quantity is deducted here.
     */
    for (const prescribedMedicine of medicines) {
      await recalculateMedicineStatus(
        prescribedMedicine.medicineId,
      );
    }

    return res.status(201).json(
      prescription,
    );
  } catch (error) {
    console.error(
      "Error creating prescription:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to create prescription",
    });
  }
};

/*
 * Update prescription.
 *
 * Allowed:
 *   - admin
 *   - doctor
 *
 * Doctors can only update prescriptions
 * they created.
 *
 * Patients and pharmacists cannot update
 * prescriptions.
 */
export const updatePrescription = async (
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

    if (
      !hasRole(user, [
        "admin",
        "doctor",
      ])
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Only doctors and administrators can update prescriptions",
      });
    }

    const prescription =
      await Prescription.findById(
        req.params.id,
      );

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found",
      });
    }

    /*
     * Doctors can only update prescriptions
     * they created.
     */
    if (
      user.role === "doctor" &&
      prescription.doctorId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only update your own prescriptions",
      });
    }

    /*
     * Only explicitly editable fields are accepted.
     *
     * patientId, doctorId and medicines cannot
     * be changed through this endpoint.
     */
    const allowedFields = [
      "instructions",
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

    /*
     * Status changes are handled separately.
     */
    if (req.body.status !== undefined) {
      const allowedStatuses = [
        "active",
        "dispensed",
        "cancelled",
      ];

      if (
        !allowedStatuses.includes(
          req.body.status,
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid prescription status",
        });
      }

      /*
       * Dispensing must use the dedicated
       * /dispense endpoint because it performs
       * inventory deduction.
       */
      if (
        req.body.status === "dispensed"
      ) {
        return res.status(400).json({
          message:
            "Use the dispense endpoint to dispense a prescription",
        });
      }

      updatePayload.status =
        req.body.status;
    }

    if (
      Object.keys(updatePayload).length === 0
    ) {
      return res.status(400).json({
        message:
          "No valid fields provided for update",
      });
    }

    Object.assign(
      prescription,
      updatePayload,
    );

    await prescription.save();

    return res.status(200).json(
      prescription,
    );
  } catch (error) {
    console.error(
      "Error updating prescription:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to update prescription",
    });
  }
};

/*
 * Delete prescription.
 *
 * Allowed:
 *   - admin
 *   - doctor
 *
 * Doctors can only delete prescriptions
 * they created.
 *
 * Dispensed prescriptions cannot be deleted.
 */
export const deletePrescription = async (
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

    if (
      !hasRole(user, [
        "admin",
        "doctor",
      ])
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Only doctors and administrators can delete prescriptions",
      });
    }

    const prescription =
      await Prescription.findById(
        req.params.id,
      );

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found",
      });
    }

    /*
     * Doctors can only delete prescriptions
     * they created.
     */
    if (
      user.role === "doctor" &&
      prescription.doctorId !== user.id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You can only delete your own prescriptions",
      });
    }

    /*
     * Never delete an already dispensed prescription.
     */
    if (
      prescription.status === "dispensed"
    ) {
      return res.status(400).json({
        message:
          "Dispensed prescriptions cannot be deleted",
      });
    }

    await prescription.deleteOne();

    return res.status(200).json({
      message:
        "Prescription deleted successfully",
    });
  } catch (error) {
    console.error(
      "Error deleting prescription:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to delete prescription",
    });
  }
};

/*
 * Dispense prescription.
 *
 * Allowed:
 *   - admin
 *   - pharmacist
 *
 * Patients and doctors cannot dispense.
 *
 * Inventory is deducted only after all
 * medicines have been validated.
 */
export const dispensePrescription = async (
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

    if (
      !hasRole(user, [
        "admin",
        "pharmacist",
      ])
    ) {
      return res.status(403).json({
        message:
          "Forbidden: Only pharmacists and administrators can dispense prescriptions",
      });
    }

    const prescription =
      await Prescription.findById(
        req.params.id,
      );

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found",
      });
    }

    if (
      prescription.status === "dispensed"
    ) {
      return res.status(400).json({
        message:
          "Prescription has already been dispensed",
      });
    }

    if (
      prescription.status === "cancelled"
    ) {
      return res.status(400).json({
        message:
          "Cancelled prescriptions cannot be dispensed",
      });
    }

    /*
     * Re-check every medicine immediately
     * before dispensing.
     *
     * Stock may have changed after the
     * prescription was created.
     */
    for (const prescribedMedicine of prescription.medicines) {
      const medicine =
        await Medicine.findById(
          prescribedMedicine.medicineId,
        );

      if (!medicine) {
        return res.status(404).json({
          message:
            `Medicine not found: ${prescribedMedicine.medicineName}`,
        });
      }

      if (
        medicine.expiryDate &&
        new Date(medicine.expiryDate) < new Date()
      ) {
        return res.status(400).json({
          message:
            `${medicine.name} has expired and cannot be dispensed`,
        });
      }

      if (
        medicine.quantity <
        prescribedMedicine.quantity
      ) {
        return res.status(400).json({
          message:
            `Insufficient stock for ${medicine.name}. Available: ${medicine.quantity}, required: ${prescribedMedicine.quantity}`,
        });
      }

      if (medicine.quantity <= 0) {
        return res.status(400).json({
          message:
            `${medicine.name} is out of stock`,
        });
      }
    }

    /*
     * Deduct inventory only when actually dispensing.
     *
     * The quantity condition prevents the database
     * from deducting more stock than is available.
     */
    for (const prescribedMedicine of prescription.medicines) {
      await Medicine.findOneAndUpdate(
        {
          _id: prescribedMedicine.medicineId,
          quantity: {
            $gte: prescribedMedicine.quantity,
          },
        },
        {
          $inc: {
            quantity:
              -prescribedMedicine.quantity,
          },
        },
      );

      await recalculateMedicineStatus(
        prescribedMedicine.medicineId,
      );
    }

    prescription.status = "dispensed";

    await prescription.save();

    return res.status(200).json({
      message:
        "Prescription dispensed successfully",
      prescription,
    });
  } catch (error) {
    console.error(
      "Error dispensing prescription:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to dispense prescription",
    });
  }
};