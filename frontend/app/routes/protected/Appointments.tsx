import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type User = {
  _id: string;
  name: string;
  email?: string;
  specialization?: string;
  department?: string;
  image?: string;
};

type Appointment = {
  _id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  reason: string;
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
  createdAt: string;
};

export default function Appointments() {
  const { data: session, isPending: sessionLoading } =
    authClient.useSession();

  const currentUser = session?.user;
  const isPatient = currentUser?.role === "patient";

  const [patients, setPatients] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);

  /*
   * Load users needed for appointment creation.
   *
   * Patients:
   * - Do not call the general patient list endpoint.
   * - Their own ID comes directly from the authenticated session.
   *
   * Admin / Doctor / Nurse:
   * - Can use the protected general patient list.
   *
   * All authenticated users:
   * - Use the dedicated safe doctor endpoint.
   */
  const loadUsers = async () => {
    try {
      const doctorsResponse = await fetch(
        `${API_URL}/users/doctors`,
        {
          credentials: "include",
        },
      );

      if (!doctorsResponse.ok) {
        throw new Error("Failed to load doctors");
      }

      const doctorsData = await doctorsResponse.json();

      setDoctors(doctorsData || []);

      if (isPatient && currentUser?.id) {
        setPatientId(currentUser.id);
        setPatients([]);
        return;
      }

      const patientsResponse = await fetch(
        `${API_URL}/users?role=patient&limit=100`,
        {
          credentials: "include",
        },
      );

      if (!patientsResponse.ok) {
        throw new Error("Failed to load patients");
      }

      const patientsData = await patientsResponse.json();

      setPatients(patientsData.res || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load patients and doctors.");
    }
  };

  /*
   * Load appointments.
   *
   * The backend determines which appointments
   * the authenticated user is allowed to see.
   */
  const loadAppointments = async () => {
    try {
      const response = await fetch(
        `${API_URL}/appointments`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load appointments");
      }

      const data = await response.json();

      setAppointments(data);
    } catch (error) {
      console.error(error);
      alert("Failed to load appointments.");
    }
  };

  useEffect(() => {
    if (sessionLoading || !currentUser?.id) {
      return;
    }

    loadUsers();
    loadAppointments();
  }, [
    sessionLoading,
    currentUser?.id,
    currentUser?.role,
  ]);

  const createAppointment = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    /*
     * For patients, always use the authenticated
     * user's own ID.
     *
     * Do not trust a patientId selected from
     * the browser.
     */
    const finalPatientId = isPatient
      ? currentUser?.id || ""
      : patientId;

    if (
      !finalPatientId ||
      !doctorId ||
      !appointmentDate ||
      !reason.trim()
    ) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/appointments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            patientId: finalPatientId,
            doctorId,
            appointmentDate,
            reason: reason.trim(),
            notes: notes.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create appointment",
        );
      }

      alert(
        "Appointment created successfully.",
      );

      if (!isPatient) {
        setPatientId("");
      }

      setDoctorId("");
      setAppointmentDate("");
      setReason("");
      setNotes("");

      await loadAppointments();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to create appointment.",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (
    id: string,
    status: Appointment["status"],
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/appointments/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ status }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update appointment",
        );
      }

      await loadAppointments();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update appointment.",
      );
    }
  };

  const deleteAppointment = async (
    id: string,
  ) => {
    if (
      !confirm(
        "Delete this appointment?",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/appointments/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete appointment",
        );
      }

      await loadAppointments();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete appointment.",
      );
    }
  };

  const getPatientName = (
    id: string,
  ) => {
    if (
      isPatient &&
      currentUser?.id === id
    ) {
      return currentUser.name;
    }

    return (
      patients.find(
        (patient) =>
          patient._id === id,
      )?.name || id
    );
  };

  const getDoctorName = (
    id: string,
  ) => {
    return (
      doctors.find(
        (doctor) =>
          doctor._id === id,
      )?.name || id
    );
  };

  if (sessionLoading) {
    return (
      <div className="p-8">
        Loading appointments...
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">
          Appointments
        </h1>

        <p className="mt-1 text-muted-foreground">
          Schedule and manage patient
          appointments.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Create Appointment */}
        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">
            New Appointment
          </h2>

          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            {isPatient
              ? "Book an appointment with a doctor."
              : "Schedule an appointment between a patient and doctor."}
          </p>

          <form
            onSubmit={createAppointment}
            className="space-y-4"
          >
            {/* Patient selector only for staff */}
            {!isPatient && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Patient *
                </label>

                <select
                  value={patientId}
                  onChange={(event) =>
                    setPatientId(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  <option value="">
                    Select patient
                  </option>

                  {patients.map(
                    (patient) => (
                      <option
                        key={patient._id}
                        value={patient._id}
                      >
                        {patient.name}
                        {patient.email
                          ? ` — ${patient.email}`
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </div>
            )}

            {/* Patient identity */}
            {isPatient && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Patient
                </label>

                <div className="w-full rounded-md border bg-muted px-3 py-2">
                  {currentUser?.name}
                </div>
              </div>
            )}

            {/* Doctor */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Doctor *
              </label>

              <select
                value={doctorId}
                onChange={(event) =>
                  setDoctorId(
                    event.target.value,
                  )
                }
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                <option value="">
                  Select doctor
                </option>

                {doctors.map(
                  (doctor) => (
                    <option
                      key={doctor._id}
                      value={doctor._id}
                    >
                      {doctor.name}
                      {doctor.specialization
                        ? ` — ${doctor.specialization}`
                        : ""}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Date & Time */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Date & Time *
              </label>

              <input
                type="datetime-local"
                value={appointmentDate}
                onChange={(event) =>
                  setAppointmentDate(
                    event.target.value,
                  )
                }
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Reason *
              </label>

              <input
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value,
                  )
                }
                placeholder="e.g. General consultation"
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value,
                  )
                }
                rows={3}
                placeholder="Additional notes..."
                className="w-full resize-none rounded-md border bg-background px-3 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                doctors.length === 0
              }
              className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create Appointment"}
            </button>
          </form>
        </div>

        {/* Appointment List */}
        <div className="rounded-xl border p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Appointment List
            </h2>

            <p className="text-sm text-muted-foreground">
              {isPatient
                ? "View your appointments."
                : "View and manage scheduled appointments."}
            </p>
          </div>

          {appointments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="font-medium">
                No appointments
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {isPatient
                  ? "Book an appointment using the form."
                  : "Create an appointment using the form."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map(
                (appointment) => (
                  <div
                    key={appointment._id}
                    className="rounded-lg border p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {appointment.reason}
                        </h3>

                        <p className="mt-1 text-sm">
                          Patient:{" "}
                          {getPatientName(
                            appointment.patientId,
                          )}
                        </p>

                        <p className="text-sm">
                          Doctor:{" "}
                          {getDoctorName(
                            appointment.doctorId,
                          )}
                        </p>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {new Date(
                            appointment.appointmentDate,
                          ).toLocaleString()}
                        </p>

                        {appointment.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Notes:{" "}
                            {appointment.notes}
                          </p>
                        )}
                      </div>

                      <span className="rounded-full border px-3 py-1 text-xs">
                        {appointment.status}
                      </span>
                    </div>

                    {/* Only staff should manage appointment status/delete */}
                    {!isPatient && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {appointment.status ===
                          "scheduled" && (
                          <>
                            <button
                              onClick={() =>
                                updateStatus(
                                  appointment._id,
                                  "completed",
                                )
                              }
                              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                            >
                              Mark Completed
                            </button>

                            <button
                              onClick={() =>
                                updateStatus(
                                  appointment._id,
                                  "cancelled",
                                )
                              }
                              className="rounded-md border px-3 py-2 text-sm"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        <button
                          onClick={() =>
                            deleteAppointment(
                              appointment._id,
                            )
                          }
                          className="rounded-md border border-red-500/30 px-3 py-2 text-sm text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}