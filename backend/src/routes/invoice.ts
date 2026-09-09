import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";

import {
  createCheckoutSession,
  getMyActiveInvoice,
  getBillingHistory,
  allBilling,
} from "../controllers/invoice";

const invoiceRouter = Router();

invoiceRouter.get(
  "/my-active-invoice",
  requireAuth,
  checkRole(["patient"]),
  getMyActiveInvoice,
);

invoiceRouter.get(
  "/",
  requireAuth,
  checkRole(["admin"]),
  allBilling,
);

invoiceRouter.get(
  "/history",
  requireAuth,
  checkRole(["patient"]),
  getBillingHistory,
);

invoiceRouter.post(
  "/:id/checkout",
  requireAuth,
  checkRole(["admin", "patient"]),
  createCheckoutSession,
);

export default invoiceRouter;