import {
  createUploadthing,
  type FileRouter,
} from "uploadthing/express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";

const f = createUploadthing();

export const uploadRouter = {
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      const session =
        await auth.api.getSession({
          headers: fromNodeHeaders(
            req.headers,
          ),
        });

      if (!session) {
        throw new Error("Unauthorized");
      }

      const user = session.user as any;

      const allowedRoles = [
        "admin",
        "doctor",
        "lab_tech",
      ];

      if (!allowedRoles.includes(user.role)) {
        throw new Error(
          "Forbidden: Insufficient permissions",
        );
      }

      return {
        uploaderId: user.id,
        uploaderRole: user.role,
      };
    })
    .onUploadComplete(
      async ({ metadata, file }) => {
        console.log(
          `✅ Uploaded by ${metadata.uploaderRole} ID: ${metadata.uploaderId}`,
        );

        console.log(
          `✅ File URL: ${file.ufsUrl}`,
        );

        return {
          url: file.ufsUrl,
        };
      },
    ),
} satisfies FileRouter;

export type OurFileRouter =
  typeof uploadRouter;