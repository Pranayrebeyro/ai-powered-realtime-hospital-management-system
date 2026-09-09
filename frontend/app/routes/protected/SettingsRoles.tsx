import { useMemo, useState } from "react";

type Permission = "read" | "create" | "update" | "delete";

type RolePermissions = {
  role: string;
  description: string;
  permissions: Record<string, Permission[]>;
};

const roles: RolePermissions[] = [
  {
    role: "Admin",
    description: "Full access to the hospital management system.",
    permissions: {
      Patients: ["read", "create", "update", "delete"],
      Vitals: ["read", "create", "update", "delete"],
      "Lab Results": ["read", "create", "update", "delete"],
      Prescriptions: ["read", "create", "update", "delete"],
      Pharmacy: ["read", "create", "update", "delete"],
      Billing: ["read", "create", "update", "delete"],
      Appointments: ["read", "create", "update", "delete"],
      Telemedicine: ["read", "create", "update", "delete"],
    },
  },
  {
    role: "Doctor",
    description: "Manage patients, clinical results, prescriptions and appointments.",
    permissions: {
      Patients: ["read", "update"],
      "Lab Results": ["read", "create", "update"],
      Prescriptions: ["read", "create", "update"],
      Appointments: ["read", "create", "update"],
      Telemedicine: ["read", "create", "update"],
    },
  },
  {
    role: "Nurse",
    description: "Access patient information, vitals and laboratory results.",
    permissions: {
      Patients: ["read", "update"],
      Vitals: ["read", "create", "update"],
      "Lab Results": ["read"],
      Appointments: ["read", "update"],
      Telemedicine: ["read"],
    },
  },
  {
    role: "Pharmacist",
    description: "Manage pharmacy inventory, prescriptions and billing.",
    permissions: {
      Prescriptions: ["read", "update"],
      Pharmacy: ["read", "create", "update", "delete"],
      Billing: ["read", "create", "update"],
    },
  },
  {
    role: "Lab Technician",
    description: "Create and update laboratory results.",
    permissions: {
      "Lab Results": ["read", "create", "update"],
    },
  },
  {
    role: "Patient",
    description: "Access personal information, appointments and medical records.",
    permissions: {
      "My Profile": ["read", "update"],
      "My Billing": ["read"],
      Appointments: ["read", "create"],
      Telemedicine: ["read"],
      Prescriptions: ["read"],
      "Lab Results": ["read"],
    },
  },
];

const permissionLabels: Permission[] = [
  "read",
  "create",
  "update",
  "delete",
];

export default function SettingsRoles() {
  const [selectedRole, setSelectedRole] = useState("Admin");

  const currentRole = useMemo(
    () => roles.find((item) => item.role === selectedRole) ?? roles[0],
    [selectedRole],
  );

  const resources = Object.keys(currentRole.permissions);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage access levels for hospital staff and patients.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">Roles</h2>

          <div className="space-y-2">
            {roles.map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => setSelectedRole(item.role)}
                className={`w-full rounded-lg px-4 py-3 text-left text-sm transition ${
                  selectedRole === item.role
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <div className="font-medium">{item.role}</div>
                <div
                  className={`mt-1 text-xs ${
                    selectedRole === item.role
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }`}
                >
                  {Object.keys(item.permissions).length} resources
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="border-b p-6">
            <h2 className="text-xl font-semibold">
              {currentRole.role}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {currentRole.description}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-6 py-4 text-left font-semibold">
                    Resource
                  </th>

                  {permissionLabels.map((permission) => (
                    <th
                      key={permission}
                      className="px-4 py-4 text-center font-semibold capitalize"
                    >
                      {permission}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {resources.map((resource) => {
                  const permissions =
                    currentRole.permissions[resource];

                  return (
                    <tr
                      key={resource}
                      className="border-b last:border-0"
                    >
                      <td className="px-6 py-4 font-medium">
                        {resource}
                      </td>

                      {permissionLabels.map((permission) => {
                        const allowed =
                          permissions.includes(permission);

                        return (
                          <td
                            key={permission}
                            className="px-4 py-4 text-center"
                          >
                            {allowed ? (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                ✓
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}