import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

import type { Role, User } from "@/types";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

import {
  Loader2,
  Plus,
  Mail,
  Lock,
  Building2,
  FileHeart,
  UserIcon,
  Pencil,
} from "lucide-react";

import { CustomInput } from "@/components/global/CustomInput";
import { CustomSelect } from "@/components/global/CustomSelect";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  type UserValues,
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  SPECIALIZATION_OPTIONS,
  PATIENT_STATUS_OPTIONS,
  STAFF_STATUS_OPTIONS,
  userSchema,
} from "./create-user-schema";

import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

import { useMutation } from "@tanstack/react-query";

import {
  createActityLog,
  triggerAdmission,
  updateUser,
} from "@/lib/api";

import { socket } from "@/lib/socket";

interface UserModalProps {
  role: Role;
  user?: User;
  loading?: boolean;
}

const CreateUserModal = ({
  role,
  user,
  loading,
}: UserModalProps) => {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const isEdit = !!user;

  const roleLabel =
    role.charAt(0).toUpperCase() + role.slice(1);

  const schema = userSchema(isEdit);

  const form = useForm<UserValues>({
    resolver: zodResolver(schema),

    defaultValues: {
      name: "",
      email: "",
      password: "",
      specialization: "",
      department: "",
      age: "",
      gender: "",
      bloodgroup: "",
      medicalHistory: "",
      status:
        role === "patient"
          ? "admitted"
          : "active",
    },
  });

  /*
   * Reset form when the dialog opens.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        password: "",
        status: user.status as string,
        specialization:
          user.specialization || "",
        department:
          user.department || "",
        age: user.age || "",
        gender: user.gender || "",
        bloodgroup:
          user.bloodgroup || "",
        medicalHistory:
          user.medicalHistory || "",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        password: "",
        status:
          role === "patient"
            ? "admitted"
            : "active",
        specialization: "",
        department: "",
        age: "",
        gender: "",
        bloodgroup: "",
        medicalHistory: "",
      });
    }
  }, [open, user, form, role]);

  /*
   * Patient admission mutation.
   */
  const admitMutation = useMutation({
    mutationFn: triggerAdmission,

    onSuccess: () => {
      toast.success(
        "User admitted successfully!",
      );

      setOpen(false);
      form.reset();
    },

    onError: (error) => {
      toast.error(
        error.message ||
          "Failed to update user",
      );
    },
  });

  /*
   * Normal profile update mutation.
   *
   * IMPORTANT:
   * Password is NOT handled here.
   * Password updates are handled directly
   * through Better Auth below.
   */
  const updateMutation = useMutation({
    mutationFn: updateUser,

    onSuccess: () => {
      toast.success(
        "User updated successfully!",
      );

      setOpen(false);
      form.reset();
    },

    onError: (error) => {
      toast.error(
        error.message ||
          "Failed to update user",
      );
    },
  });

  /*
   * Activity log mutation.
   */
  const activityMutation = useMutation({
    mutationFn: createActityLog,

    onError: (error) => {
      console.log(
        "Activity Log Error:",
        error,
      );
    },
  });

  /*
   * Submit form.
   */
  const onSubmit = async (
    data: UserValues,
  ) => {
    /*
     * Prepare the profile payload.
     *
     * Password is intentionally NOT included.
     */
    const payload: Record<
      string,
      unknown
    > = {
      name: data.name,
      email: data.email,
      role: role,
      status: data.status,
    };

    /*
     * Role-specific fields.
     */
    if (role === "doctor") {
      payload.specialization =
        data.specialization;

      payload.department =
        data.department;
    } else if (role === "patient") {
      payload.age = data.age;
      payload.gender = data.gender;
      payload.bloodgroup =
        data.bloodgroup;
      payload.medicalHistory =
        data.medicalHistory;
    } else if (
      [
        "nurse",
        "lab_tech",
        "pharmacist",
      ].includes(role)
    ) {
      payload.department =
        data.department;
    }

    /*
     * =====================================================
     * EDIT EXISTING USER
     * =====================================================
     */
    if (isEdit && user) {
      try {
        setIsCreating(true);

        /*
         * -------------------------------------------------
         * PASSWORD UPDATE
         * -------------------------------------------------
         *
         * Password MUST be changed through Better Auth.
         *
         * Do NOT send password to our custom
         * updateUser endpoint.
         */
        if (data.password) {
          const { error } =
            await authClient.admin.setUserPassword(
              {
                userId: user._id,
                newPassword:
                  data.password,
              },
            );

          if (error) {
            console.error(
              "Failed to update password:",
              error,
            );

            throw new Error(
              error.message ||
                "Failed to update user password",
            );
          }
        }

        /*
         * -------------------------------------------------
         * PROFILE UPDATE
         * -------------------------------------------------
         *
         * Email, role and password are NOT sent here.
         */
        await updateMutation.mutateAsync({
          userId: user._id,
          userData: payload,
        });

        /*
         * Activity log.
         *
         * The backend already emits
         * "notify_user_updated" after a successful
         * profile update, so we intentionally DO NOT
         * emit that event from the client here.
         */
        activityMutation.mutate({
          userId: user._id,
          action: "update",
          details: `${roleLabel} account updated for ${user.name}`,
        });
      } catch (error) {
        console.error(
          "Error updating user:",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update user",
        );
      } finally {
        setIsCreating(false);
      }

      return;
    }

    /*
     * =====================================================
     * CREATE NEW USER
     * =====================================================
     */
    try {
      setIsCreating(true);

      /*
       * Better Auth creates the actual account
       * and stores the password correctly.
       */
      const {
        error,
        data: createdUser,
      } =
        await authClient.admin.createUser(
          {
            name: data.name,
            email: data.email,
            password: data.password!,
            // @ts-ignore
            role: role,

            /*
             * Custom application fields.
             */
            data: {
              ...payload,
            },
          },
        );

      if (error) {
        throw error;
      }

      if (!createdUser) {
        throw new Error(
          "User was not created",
        );
      }

      /*
       * If a patient is created with
       * admitted status, trigger admission.
       */
      if (
        role === "patient" &&
        data.status === "admitted"
      ) {
        admitMutation.mutate({
          patientId:
            createdUser.user.id,

          admissionReason:
            data.medicalHistory ||
            "General Admission",
        });
      }

      /*
       * Notify connected clients.
       *
       * The socket server only accepts this event
       * from admin/superadmin users.
       */
      socket.emit(
        "notify_user_created",
      );

      toast.success(
        `${roleLabel} created successfully!`,
      );

      /*
       * Activity log.
       */
      activityMutation.mutate({
        userId:
          createdUser.user.id,

        action: "create",

        details: `${roleLabel} account created for ${createdUser.user.name}`,
      });

      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(
        "Error creating user:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create user",
      );
    } finally {
      setIsCreating(false);
    }
  };

  /*
   * Combined loading state.
   */
  const isLoading =
    loading ||
    isCreating ||
    admitMutation.isPending ||
    updateMutation.isPending ||
    activityMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button
            variant="outline"
            disabled={loading}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus size={16} />
            Add {roleLabel}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl min-w-xl max-h-[98vh] overflow-y-auto card">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Edit"
              : "Add New"}{" "}
            {roleLabel}
          </DialogTitle>

          <DialogDescription>
            {isEdit
              ? `Update details for ${user?.name}.`
              : `Enter details to create a new ${roleLabel} account.`}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(
            onSubmit,
          )}
          className="space-y-4 py-4"
        >
          {/* Full Name */}
          <CustomInput
            control={form.control}
            name="name"
            label="Full Name"
            placeholder="John Doe"
            startIcon={
              <UserIcon size={18} />
            }
          />

          {/* Email */}
          <CustomInput
            control={form.control}
            name="email"
            label="Email Address"
            type="email"
            placeholder="john@hospital.com"
            startIcon={
              <Mail size={18} />
            }
          />

          {/* Password */}
          <CustomInput
            control={form.control}
            name="password"
            label={
              isEdit
                ? "New Password (Optional)"
                : "Password"
            }
            type="password"
            placeholder={
              isEdit
                ? "Leave blank to keep current"
                : "••••••••"
            }
            startIcon={
              <Lock size={18} />
            }
          />

          {/* Doctor fields */}
          {role === "doctor" && (
            <>
              <CustomSelect
                control={form.control}
                name="specialization"
                label="Specialization"
                placeholder="Select Specialization"
                options={
                  SPECIALIZATION_OPTIONS
                }
              />

              <CustomInput
                control={form.control}
                name="department"
                label="Department"
                placeholder="e.g. Cardiology Wing A"
                startIcon={
                  <Building2 size={18} />
                }
              />
            </>
          )}

          {/* Patient fields */}
          {role === "patient" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <CustomInput
                  control={form.control}
                  name="age"
                  label="Age"
                  type="number"
                  placeholder="e.g. 34"
                />

                <CustomSelect
                  control={form.control}
                  name="gender"
                  label="Gender"
                  options={
                    GENDER_OPTIONS
                  }
                />
              </div>

              <CustomSelect
                control={form.control}
                name="bloodgroup"
                label="Blood Group"
                options={
                  BLOOD_GROUP_OPTIONS
                }
              />

              <CustomInput
                control={form.control}
                name="medicalHistory"
                label="Medical History / Allergies / Reason for Admission"
                placeholder="Peanuts, Penicillin..."
                startIcon={
                  <FileHeart size={18} />
                }
              />
            </>
          )}

          {/* Status */}
          <CustomSelect
            control={form.control}
            name="status"
            label="Status"
            placeholder="Select Status"
            options={
              role === "patient"
                ? PATIENT_STATUS_OPTIONS
                : STAFF_STATUS_OPTIONS
            }
          />

          {/* Nurse / Lab Tech / Pharmacist */}
          {[
            "nurse",
            "lab_tech",
            "pharmacist",
          ].includes(role) && (
            <CustomInput
              control={form.control}
              name="department"
              label="Department"
              placeholder="e.g. ICU, Lab, Pharmacy"
              startIcon={
                <Building2 size={18} />
              }
            />
          )}

          {/* Footer */}
          <DialogFooter className="mt-6 border-none">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                form.reset();
              }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}

              {isEdit
                ? "Update"
                : "Create"}{" "}
              Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserModal;