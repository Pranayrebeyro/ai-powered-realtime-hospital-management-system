import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { polarClient } from "@polar-sh/better-auth/client";

import {
  ac,
  adminRole,
  superadminRole,
  doctorRole,
  nurseRole,
  pharmacistRole,
  labTechRole,
  patientRole,
} from "./permissions";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const authClient = createAuthClient({
  baseURL: API_URL.replace(/\/api$/, ""),

  plugins: [
    adminClient({
      ac,
      roles: {
        admin: adminRole,
        superadmin: superadminRole,
        doctor: doctorRole,
        nurse: nurseRole,
        pharmacist: pharmacistRole,
        lab_tech: labTechRole,
        patient: patientRole,
      },
    }),

    polarClient(),
  ],
});