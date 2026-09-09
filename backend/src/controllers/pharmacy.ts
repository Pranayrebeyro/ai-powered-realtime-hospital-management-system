import type { Request, Response } from "express";
import Medicine from "../models/medicine";

const getCurrentUser = (req: Request) => {
  return (req as any).user;
};

const calculateMedicineStatus = (
  quantity: number,
  reorderLevel: number,
  expiryDate?: Date | string | null,
) => {
  if (
    expiryDate &&
    new Date(expiryDate) < new Date()
  ) {
    return "expired";
  }

  if (quantity <= 0) {
    return "out_of_stock";
  }

  if (quantity <= reorderLevel) {
    return "low_stock";
  }

  return "available";
};

const hasRole = (
  req: Request,
  allowedRoles: string[],
) => {
  const user = getCurrentUser(req);

  return (
    !!user?.id &&
    !!user?.role &&
    allowedRoles.includes(user.role)
  );
};

const requireRole = (
  req: Request,
  res: Response,
  allowedRoles: string[],
) => {
  const user = getCurrentUser(req);

  if (!user?.id || !user?.role) {
    res.status(401).json({
      message: "Unauthorized",
    });

    return false;
  }

  if (!allowedRoles.includes(user.role)) {
    res.status(403).json({
      message:
        "Forbidden: Insufficient permissions",
    });

    return false;
  }

  return true;
};

/*
 * View pharmacy inventory.
 *
 * Doctors, pharmacists, and admins can view medicines.
 */
export const getMedicines = async (
  req: Request,
  res: Response,
) => {
  try {
    if (
      !requireRole(
        req,
        res,
        ["admin", "doctor", "pharmacist"],
      )
    ) {
      return;
    }

    const medicines = await Medicine.find().sort({
      createdAt: -1,
    });

    return res.status(200).json(medicines);
  } catch (error) {
    console.error(
      "Error fetching medicines:",
      error,
    );

    return res.status(500).json({
      message: "Failed to fetch medicines",
    });
  }
};

/*
 * View one medicine.
 *
 * Doctors, pharmacists, and admins can view medicines.
 */
export const getMedicineById = async (
  req: Request,
  res: Response,
) => {
  try {
    if (
      !requireRole(
        req,
        res,
        ["admin", "doctor", "pharmacist"],
      )
    ) {
      return;
    }

    const medicine = await Medicine.findById(
      req.params.id,
    );

    if (!medicine) {
      return res.status(404).json({
        message: "Medicine not found",
      });
    }

    return res.status(200).json(medicine);
  } catch (error) {
    console.error(
      "Error fetching medicine:",
      error,
    );

    return res.status(500).json({
      message: "Failed to fetch medicine",
    });
  }
};

/*
 * Create medicine.
 *
 * Only pharmacists and admins can create inventory items.
 */
export const createMedicine = async (
  req: Request,
  res: Response,
) => {
  try {
    if (
      !requireRole(
        req,
        res,
        ["admin", "pharmacist"],
      )
    ) {
      return;
    }

    const {
      name,
      category,
      manufacturer,
      batchNumber,
      quantity,
      unitPrice,
      expiryDate,
      reorderLevel,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        message:
          "Medicine name and category are required",
      });
    }

    const medicineQuantity =
      quantity ?? 0;

    const medicineReorderLevel =
      reorderLevel ?? 10;

    const status = calculateMedicineStatus(
      medicineQuantity,
      medicineReorderLevel,
      expiryDate,
    );

    const medicine =
      await Medicine.create({
        name,
        category,
        manufacturer,
        batchNumber,
        quantity: medicineQuantity,
        unitPrice: unitPrice ?? 0,
        expiryDate,
        reorderLevel:
          medicineReorderLevel,
        status,
      });

    return res.status(201).json(medicine);
  } catch (error) {
    console.error(
      "Error creating medicine:",
      error,
    );

    return res.status(500).json({
      message: "Failed to create medicine",
    });
  }
};

/*
 * Update medicine.
 *
 * Only pharmacists and admins can update inventory.
 */
export const updateMedicine = async (
  req: Request,
  res: Response,
) => {
  try {
    if (
      !requireRole(
        req,
        res,
        ["admin", "pharmacist"],
      )
    ) {
      return;
    }

    const medicine = await Medicine.findById(
      req.params.id,
    );

    if (!medicine) {
      return res.status(404).json({
        message: "Medicine not found",
      });
    }

    /*
     * Status is calculated by the server.
     *
     * The client cannot directly set the status.
     */
    const allowedFields = [
      "name",
      "category",
      "manufacturer",
      "batchNumber",
      "quantity",
      "unitPrice",
      "expiryDate",
      "reorderLevel",
    ];

    for (const field of allowedFields) {
      if (
        req.body[field] !== undefined &&
        req.body[field] !== null
      ) {
        (medicine as any)[field] =
          req.body[field];
      }
    }

    medicine.status =
      calculateMedicineStatus(
        medicine.quantity,
        medicine.reorderLevel,
        medicine.expiryDate,
      );

    await medicine.save();

    return res.status(200).json(medicine);
  } catch (error) {
    console.error(
      "Error updating medicine:",
      error,
    );

    return res.status(500).json({
      message: "Failed to update medicine",
    });
  }
};

/*
 * Delete medicine.
 *
 * Only pharmacists and admins can delete inventory.
 */
export const deleteMedicine = async (
  req: Request,
  res: Response,
) => {
  try {
    if (
      !requireRole(
        req,
        res,
        ["admin", "pharmacist"],
      )
    ) {
      return;
    }

    const medicine =
      await Medicine.findByIdAndDelete(
        req.params.id,
      );

    if (!medicine) {
      return res.status(404).json({
        message: "Medicine not found",
      });
    }

    return res.status(200).json({
      message:
        "Medicine deleted successfully",
    });
  } catch (error) {
    console.error(
      "Error deleting medicine:",
      error,
    );

    return res.status(500).json({
      message: "Failed to delete medicine",
    });
  }
};