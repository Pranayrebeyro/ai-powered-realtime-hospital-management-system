import express from "express";

const userRouter = express.Router();

import {
  fetchAllUsers,
  getDoctors,
  getUserById,
  updateUser,
  admitPatient,
  getPolarPortalLink,
} from "../controllers/user";

import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";

userRouter.get(
  "/",
  requireAuth,
  checkRole(["admin", "doctor", "nurse"]),
  fetchAllUsers,
);

// Safe doctor list for appointment/telemedicine selection
userRouter.get(
  "/doctors",
  requireAuth,
  checkRole(["admin", "doctor", "nurse", "patient"]),
  getDoctors,
);

userRouter.put(
  "/update/:id",
  requireAuth,
  checkRole(["admin", "doctor", "nurse"]),
  updateUser,
);

// Patient can view their own profile.
// Medical staff/admin can view profiles as permitted by the controller.
userRouter.get(
  "/profile/:id",
  requireAuth,
  getUserById,
);

userRouter.post(
  "/:id/admit",
  requireAuth,
  checkRole(["admin", "doctor", "nurse"]),
  admitPatient,
);

userRouter.get(
  "/polar-portal/:userId",
  requireAuth,
  getPolarPortalLink,
);

export default userRouter;