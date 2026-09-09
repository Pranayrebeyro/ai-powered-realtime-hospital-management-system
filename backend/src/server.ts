import dotenv from "dotenv";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { serve } from "inngest/express";
import { createServer } from "http";

import { connectDB } from "./config/db";
import { auth } from "./lib/auth";

import userRouter from "./routes/user";
import activityLogRouter from "./routes/activity";
import notificationRouter from "./routes/notification";
import labResultsRouter from "./routes/labResults";
import invoiceRouter from "./routes/invoice";
import pharmacyRouter from "./routes/pharmacy";
import prescriptionRouter from "./routes/prescription";
import labRequestRouter from "./routes/labRequest";
import appointmentRouter from "./routes/appointment";
import telemedicineRouter from "./routes/telemedicine";
import settingsRouter from "./routes/settings";
import uploadthingRouter from "./routes/uploadthing";
import supportTicketRoutes from "./routes/supportTicket";
import feedbackRoutes from "./routes/feedback";

import {
  admitPatient,
  analyzeXRayJob,
  addChargeToInvoice,
} from "./inngest/functions";

import { inngest } from "./inngest/client";

import { getIO, initSocket } from "./lib/socket";

import { uploadRouter } from "./lib/uploadthing";
import { createRouteHandler } from "uploadthing/express";

// Load environment variables from .env file.
dotenv.config();

// Initialize Express application.
const app: Application = express();

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

// Initialize Socket.IO.
initSocket(httpServer);

// Make Socket.IO accessible through
// req.app.get("io") for backwards compatibility.
app.set("io", getIO());

// --------------------------------------------------
// Middleware
// --------------------------------------------------

// CORS configuration.
app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:5173",
    credentials: true,
  }),
);

// Security headers.
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

// Cookie parser.
app.use(cookieParser());

// Body parsers.
app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

// Logging middleware.
// Enabled only in development.
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// --------------------------------------------------
// Basic health/test route
// --------------------------------------------------

app.get(
  "/",
  (req: Request, res: Response) => {
    res.send("Hello from the backend!");
  },
);

// --------------------------------------------------
// Better Auth
// --------------------------------------------------

app.all(
  "/api/auth/*splat",
  toNodeHandler(auth),
);

// --------------------------------------------------
// Current authenticated user
// --------------------------------------------------

app.get(
  "/api/me",
  async (req, res) => {
    try {
      const session =
        await auth.api.getSession({
          headers: fromNodeHeaders(
            req.headers,
          ),
        });

      if (!session) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      return res.json(session);
    } catch (error) {
      console.error(
        "Error fetching session:",
        error,
      );

      return res.status(401).json({
        message: "Unauthorized",
      });
    }
  },
);

// --------------------------------------------------
// API Routes
// --------------------------------------------------

app.use(
  "/api/users",
  userRouter,
);

app.use(
  "/api/activity-logs",
  activityLogRouter,
);

app.use(
  "/api/notifications",
  notificationRouter,
);

app.use(
  "/api/invoices",
  invoiceRouter,
);

app.use(
  "/api/pharmacy",
  pharmacyRouter,
);

app.use(
  "/api/prescriptions",
  prescriptionRouter,
);

app.use(
  "/api/lab-results",
  labResultsRouter,
);

app.use(
  "/api/lab-requests",
  labRequestRouter,
);

app.use(
  "/api/appointments",
  appointmentRouter,
);

app.use(
  "/api/telemedicine",
  telemedicineRouter,
);

app.use(
  "/api/settings",
  settingsRouter,
);

app.use("/api/support", supportTicketRoutes);
app.use("/api/feedback", feedbackRoutes);

// --------------------------------------------------
// Inngest
// --------------------------------------------------

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [
      admitPatient,
      analyzeXRayJob,
      addChargeToInvoice,
    ],
  }),
);

// --------------------------------------------------
// UploadThing
// --------------------------------------------------

app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: uploadRouter,
  }),
);

app.use(
  "/api/uploadthing/delete",
  uploadthingRouter,
);

// --------------------------------------------------
// Global Error Handler
// --------------------------------------------------

app.use(
  (
    err: any,
    req: Request,
    res: Response,
    next: any,
  ) => {
    const statusCode =
      res.statusCode === 200
        ? 500
        : res.statusCode;

    res.status(statusCode);

    res.json({
      message: err.message,
      stack:
        process.env.NODE_ENV === "production"
          ? null
          : err.stack,
    });
  },
);

// --------------------------------------------------
// Start Server
// --------------------------------------------------

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(
        `🚀 Server + Socket.IO running in ${process.env.NODE_ENV} mode on port ${PORT}`,
      );
    });
  })
  .catch((error) => {
    console.error(
      `Failed to connect to the database: ${
        (error as Error).message
      }`,
    );
  });