import type { Request, Response } from "express";
import { UTApi } from "uploadthing/server";
import LabResult from "../models/labResults";

export const utapi = new UTApi();

export const deleteFile = async (
  req: Request,
  res: Response,
) => {
  try {
    const currentUser = (req as any).user;

    /*
     * Authentication check.
     */
    if (!currentUser?.id || !currentUser?.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
     * Only staff who can work with lab results
     * may delete lab-result files.
     */
    const allowedRoles = [
      "admin",
      "doctor",
      "lab_tech",
    ];

    if (!allowedRoles.includes(currentUser.role)) {
      return res.status(403).json({
        message:
          "Forbidden: Insufficient permissions",
      });
    }

    const { fileUrl } = req.body;

    if (
      !fileUrl ||
      typeof fileUrl !== "string"
    ) {
      return res.status(400).json({
        message: "File URL is required",
      });
    }

    /*
     * Find the lab result that actually owns
     * this uploaded file.
     *
     * This prevents an authenticated user from
     * deleting an arbitrary UploadThing file
     * simply by supplying its URL.
     */
    const labResult = await LabResult.findOne({
      imageUrl: fileUrl,
    });

    if (!labResult) {
      return res.status(404).json({
        message:
          "File is not associated with a lab result",
      });
    }

    /*
     * Extract the UploadThing file key.
     */
    let fileKey: string | undefined;

    try {
      const url = new URL(fileUrl);

      const pathname = url.pathname;

      fileKey = pathname
        .split("/")
        .filter(Boolean)
        .pop();
    } catch {
      return res.status(400).json({
        message: "Invalid file URL",
      });
    }

    if (!fileKey) {
      return res.status(400).json({
        message: "Invalid file URL",
      });
    }

    /*
     * Delete the physical file from UploadThing.
     */
    await utapi.deleteFiles(fileKey);

    /*
     * Remove the deleted file reference from
     * the corresponding lab result.
     *
     * This prevents the database from retaining
     * a URL pointing to a deleted file.
     */
    await LabResult.updateOne(
      {
        _id: labResult._id,
        imageUrl: fileUrl,
      },
      {
        $unset: {
          imageUrl: "",
        },
      },
    );

    /*
     * Notify connected clients that the lab result
     * has changed.
     */
    const io = req.app.get("io");

    if (io) {
  io.to(
    `user_${labResult.patient.toString()}`,
  ).emit(
    "lab_result_updated",
    {
      _id: labResult._id,
      patient: labResult.patient,
      testType: labResult.testType,
      bodyPart: labResult.bodyPart,
      aiAnalysis: labResult.aiAnalysis,
      doctorNotes: labResult.doctorNotes,
      status: labResult.status,
      createdAt: labResult.createdAt,
      updatedAt: labResult.updatedAt,
    },
  );
}

    res.status(200).json({
      message:
        "File deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete file error:",
      error,
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};