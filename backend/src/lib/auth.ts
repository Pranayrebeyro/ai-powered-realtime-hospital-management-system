import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  adminAc,
} from "better-auth/plugins/admin/access";
import { MongoClient } from "mongodb";

import {
  polar,
  checkout,
  portal,
  usage,
  webhooks,
} from "@polar-sh/better-auth";

import { Polar } from "@polar-sh/sdk";
import invoice from "../models/invoice";

/*
|--------------------------------------------------------------------------
| MongoDB
|--------------------------------------------------------------------------
*/

const client = new MongoClient(process.env.MONGO_URI || "");
const db = client.db();

/*
|--------------------------------------------------------------------------
| Polar
|--------------------------------------------------------------------------
*/

export const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,

  // Use sandbox for development.
  server: "sandbox",
});

/*
|--------------------------------------------------------------------------
| Better Auth Access Control
|--------------------------------------------------------------------------
|
| These are the resources and actions available to the hospital system.
|
*/

const statement = {
  ...defaultStatements,

  patient: [
    "read",
    "create",
    "update",
    "delete",
  ],

  vitals: [
    "read",
    "create",
    "update",
    "delete",
  ],

  lab_results: [
    "read",
    "create",
    "update",
    "delete",
  ],

  prescriptions: [
    "read",
    "create",
    "update",
    "delete",
  ],

  billing: [
    "read",
    "create",
    "update",
    "delete",
  ],

  appointments: [
    "read",
    "create",
    "update",
    "delete",
  ],

  telemedicine: [
    "read",
    "create",
    "update",
    "delete",
  ],

  pharmacy: [
    "read",
    "create",
    "update",
    "delete",
  ],

  my_profile: [
    "read",
    "update",
  ],

  my_billing: [
    "read",
  ],
} as const;

const ac = createAccessControl(statement);

/*
|--------------------------------------------------------------------------
| Admin Role
|--------------------------------------------------------------------------
|
| Admin gets the default Better Auth admin permissions plus
| full permissions for hospital resources.
|
*/

const adminRole = ac.newRole({
  ...adminAc.statements,

  patient: [
    "read",
    "create",
    "update",
    "delete",
  ],

  vitals: [
    "read",
    "create",
    "update",
    "delete",
  ],

  lab_results: [
    "read",
    "create",
    "update",
    "delete",
  ],

  prescriptions: [
    "read",
    "create",
    "update",
    "delete",
  ],

  billing: [
    "read",
    "create",
    "update",
    "delete",
  ],

  appointments: [
    "read",
    "create",
    "update",
    "delete",
  ],

  telemedicine: [
    "read",
    "create",
    "update",
    "delete",
  ],

  pharmacy: [
    "read",
    "create",
    "update",
    "delete",
  ],

  my_profile: [
    "read",
    "update",
  ],

  my_billing: [
    "read",
  ],
});

/*
|--------------------------------------------------------------------------
| Super Admin Role
|--------------------------------------------------------------------------
|
| Super admin gets the same full permissions as admin.
|
*/

const superadminRole = ac.newRole({
  ...adminAc.statements,

  patient: [
    "read",
    "create",
    "update",
    "delete",
  ],

  vitals: [
    "read",
    "create",
    "update",
    "delete",
  ],

  lab_results: [
    "read",
    "create",
    "update",
    "delete",
  ],

  prescriptions: [
    "read",
    "create",
    "update",
    "delete",
  ],

  billing: [
    "read",
    "create",
    "update",
    "delete",
  ],

  appointments: [
    "read",
    "create",
    "update",
    "delete",
  ],

  telemedicine: [
    "read",
    "create",
    "update",
    "delete",
  ],

  pharmacy: [
    "read",
    "create",
    "update",
    "delete",
  ],

  my_profile: [
    "read",
    "update",
  ],

  my_billing: [
    "read",
  ],
});

/*
|--------------------------------------------------------------------------
| Doctor Role
|--------------------------------------------------------------------------
*/

const doctorRole = ac.newRole({
  patient: [
    "read",
    "update",
  ],

  lab_results: [
    "read",
    "create",
    "update",
  ],

  prescriptions: [
    "read",
    "create",
    "update",
  ],

  appointments: [
    "read",
    "create",
    "update",
  ],

  telemedicine: [
    "read",
    "create",
    "update",
  ],

  my_profile: [
    "read",
    "update",
  ],
});

/*
|--------------------------------------------------------------------------
| Nurse Role
|--------------------------------------------------------------------------
*/

const nurseRole = ac.newRole({
  patient: [
    "read",
    "update",
  ],

  vitals: [
    "read",
    "create",
    "update",
  ],

  lab_results: [
    "read",
  ],

  appointments: [
    "read",
    "update",
  ],

  telemedicine: [
    "read",
  ],

  my_profile: [
    "read",
    "update",
  ],
});

/*
|--------------------------------------------------------------------------
| Pharmacist Role
|--------------------------------------------------------------------------
*/

const pharmacistRole = ac.newRole({
  prescriptions: [
    "read",
    "update",
  ],

  pharmacy: [
    "read",
    "create",
    "update",
    "delete",
  ],

  billing: [
    "read",
    "create",
    "update",
  ],

  my_profile: [
    "read",
    "update",
  ],
});

/*
|--------------------------------------------------------------------------
| Laboratory Technician Role
|--------------------------------------------------------------------------
*/

const labTechRole = ac.newRole({
  lab_results: [
    "read",
    "create",
    "update",
  ],

  my_profile: [
    "read",
    "update",
  ],
});

/*
|--------------------------------------------------------------------------
| Patient Role
|--------------------------------------------------------------------------
*/

const patientRole = ac.newRole({
  my_profile: [
    "read",
    "update",
  ],

  my_billing: [
    "read",
  ],

  appointments: [
    "read",
    "create",
  ],

  telemedicine: [
    "read",
  ],

  prescriptions: [
    "read",
  ],

  lab_results: [
    "read",
  ],
});

/*
|--------------------------------------------------------------------------
| Better Auth
|--------------------------------------------------------------------------
*/

export const auth = betterAuth({
  database: mongodbAdapter(db),

  baseURL:
    process.env.BETTER_AUTH_URL ||
    "http://localhost:5000",

  trustedOrigins: [
    process.env.FRONTEND_URL ||
      "http://localhost:5173",
  ],

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    /*
    |--------------------------------------------------------------------------
    | Admin / RBAC
    |--------------------------------------------------------------------------
    */

    admin({
      defaultRole: "patient",

      /*
       * Your existing project uses adminRole.
       * Keep it because it is already part of your current configuration.
       */
      adminRole: [
        "admin",
        "superadmin",
      ],

      /*
       * Better Auth access control
       */
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

    /*
    |--------------------------------------------------------------------------
    | Polar
    |--------------------------------------------------------------------------
    */

    polar({
      client: polarClient,

      /*
       * We disabled automatic Polar customer creation
       * because signup previously returned a 401.
       */
      createCustomerOnSignUp: false,

      use: [
        checkout({
          authenticatedUsersOnly: true,
        }),

        portal({
          returnUrl:
            `${process.env.FRONTEND_URL}/dashboard`,
        }),

        usage(),

        webhooks({
          secret:
            process.env.POLAR_WEBHOOK_SECRET!,

          onPayload: async ({ data, type }) => {
            if (
              type === "order.paid" &&
              data.paid
            ) {
              const invoiceId =
                data.metadata?.hospitalInvoiceId;

              if (invoiceId) {
                await invoice.findByIdAndUpdate(
                  invoiceId,
                  {
                    status: "paid",
                  },
                );

                console.log(
                  `✅ Invoice ${invoiceId} marked as PAID via Polar!`,
                );
              }
            }
          },
        }),
      ],
    }),
  ],

  /*
  |--------------------------------------------------------------------------
  | User Additional Fields
  |--------------------------------------------------------------------------
  */

  user: {
    additionalFields: {
      specialization: {
        type: "string",
        required: false,
      },

      department: {
        type: "string",
        required: false,
      },

      gender: {
        type: "string",
        required: false,
      },

      bloodgroup: {
        type: "string",
        required: false,
      },

      medicalHistory: {
        type: "string",
        required: false,
      },

      age: {
        type: "string",
        required: false,
      },

      status: {
        type: "string",
        required: false,
        defaultValue: "active",
      },

      prescriptions: {
        type: "string[]",
        required: false,
      },

      appointments: {
        type: "string[]",
      },
    },
  },
});