import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  adminAc,
} from "better-auth/plugins/admin/access";

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

export const ac = createAccessControl(statement);

export const adminRole = ac.newRole({
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

export const superadminRole = ac.newRole({
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

export const doctorRole = ac.newRole({
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

export const nurseRole = ac.newRole({
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

export const pharmacistRole = ac.newRole({
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

export const labTechRole = ac.newRole({
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

export const patientRole = ac.newRole({
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