import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

const API_URL = "http://localhost:5000/api";

type User = {
  _id: string;
  name: string;
  email: string;
  specialization?: string;
  department?: string;
};

type TelemedicineSession = {
  _id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  scheduledAt: string;
  meetingUrl?: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  notes?: string;
};

export default function Telemedicine() {
  const { data: session, isPending: sessionLoading } =
    authClient.useSession();

  const currentUser = session?.user;
  const isPatient = currentUser?.role === "patient";

  const [patients, setPatients] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);

  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  /*
   * Load doctors for all authenticated roles.
   *
   * Patients must use the dedicated /users/doctors endpoint
   * because the general /users endpoint is restricted.
   *
   * Only staff roles load the general patient list.
   */
  const loadUsers = async () => {
    try {
      setUsersLoading(true);

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

      setDoctors(
        Array.isArray(doctorsData)
          ? doctorsData
          : doctorsData.res || [],
      );

      /*
       * Patients do not need the general patient endpoint.
       * Their own ID is obtained from the authenticated session.
       */
      if (!isPatient) {
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
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);

      alert("Failed to load doctors and patients.");
    } finally {
      setUsersLoading(false);
    }
  };

  /*
   * Load telemedicine sessions.
   *
   * The backend is responsible for returning only the sessions
   * the authenticated user is allowed to see.
   */
  const loadSessions = async () => {
    try {
      const response = await fetch(
        `${API_URL}/telemedicine`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load telemedicine sessions",
        );
      }

      const data = await response.json();

      setSessions(data);
    } catch (error) {
      console.error(error);

      alert("Failed to load telemedicine sessions.");
    }
  };

  useEffect(() => {
    if (sessionLoading || !currentUser) {
      return;
    }

    /*
     * Automatically assign the logged-in patient to themselves.
     */
    if (isPatient) {
      setPatientId(currentUser.id);
    }

    loadUsers();
    loadSessions();
  }, [
    sessionLoading,
    currentUser?.id,
    currentUser?.role,
  ]);

  const createSession = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const finalPatientId = isPatient
      ? currentUser?.id
      : patientId;

    if (!finalPatientId || !doctorId || !scheduledAt) {
      alert(
        "Please select a patient, doctor, and scheduled time.",
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/telemedicine`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            patientId: finalPatientId,
            doctorId,
            scheduledAt,
            meetingUrl: meetingUrl.trim(),
            notes: notes.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create telemedicine session",
        );
      }

      alert(
        "Telemedicine session created successfully.",
      );

      /*
       * Keep the logged-in patient assigned to themselves.
       */
      if (isPatient && currentUser?.id) {
        setPatientId(currentUser.id);
      } else {
        setPatientId("");
      }

      setDoctorId("");
      setScheduledAt("");
      setMeetingUrl("");
      setNotes("");

      await loadSessions();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to create telemedicine session.",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (
    id: string,
    status: TelemedicineSession["status"],
  ) => {
    /*
     * Patients should never be able to update sessions
     * from the frontend.
     *
     * The backend must also enforce this restriction.
     */
    if (isPatient) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/telemedicine/${id}`,
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
            "Failed to update telemedicine session",
        );
      }

      await loadSessions();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update session.",
      );
    }
  };

  const deleteSession = async (id: string) => {
    /*
     * Patients should never be able to delete sessions
     * from the frontend.
     *
     * The backend must also enforce this restriction.
     */
    if (isPatient) {
      return;
    }

    if (!confirm("Delete this telemedicine session?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/telemedicine/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete telemedicine session",
        );
      }

      await loadSessions();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete session.",
      );
    }
  };

  const getPatientName = (id: string) => {
    if (id === currentUser?.id && isPatient) {
      return currentUser.name;
    }

    return (
      patients.find(
        (patient) => patient._id === id,
      )?.name || id
    );
  };

  const getDoctorName = (id: string) => {
    return (
      doctors.find(
        (doctor) => doctor._id === id,
      )?.name || id
    );
  };

  if (sessionLoading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">
          Loading telemedicine...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">
          Please log in to access telemedicine.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">
          Telemedicine
        </h1>

        <p className="mt-1 text-muted-foreground">
          Schedule and manage remote doctor consultations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Create Session */}
        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">
            New Telemedicine Session
          </h2>

          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Schedule a remote consultation between a patient
            and doctor.
          </p>

          <form
            onSubmit={createSession}
            className="space-y-4"
          >
            {/* Patient */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Patient *
              </label>

              {isPatient ? (
                <input
                  type="text"
                  value={currentUser.name}
                  disabled
                  className="w-full rounded-md border bg-muted px-3 py-2"
                />
              ) : (
                <select
                  value={patientId}
                  onChange={(event) =>
                    setPatientId(event.target.value)
                  }
                  disabled={usersLoading}
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  <option value="">
                    Select patient
                  </option>

                  {patients.map((patient) => (
                    <option
                      key={patient._id}
                      value={patient._id}
                    >
                      {patient.name} — {patient.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Doctor */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Doctor *
              </label>

              <select
                value={doctorId}
                onChange={(event) =>
                  setDoctorId(event.target.value)
                }
                disabled={usersLoading}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                <option value="">
                  Select doctor
                </option>

                {doctors.map((doctor) => (
                  <option
                    key={doctor._id}
                    value={doctor._id}
                  >
                    {doctor.name}
                    {doctor.specialization
                      ? ` — ${doctor.specialization}`
                      : ` — ${doctor.email}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Date & Time *
              </label>

              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) =>
                  setScheduledAt(event.target.value)
                }
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </div>

            {/* Meeting URL */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Meeting URL
              </label>

              <input
                type="url"
                value={meetingUrl}
                onChange={(event) =>
                  setMeetingUrl(event.target.value)
                }
                placeholder="https://meet.example.com/..."
                className="w-full rounded-md border bg-background px-3 py-2"
              />

              <p className="mt-1 text-xs text-muted-foreground">
                Add the video consultation link.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                rows={3}
                placeholder="Consultation notes..."
                className="w-full resize-none rounded-md border bg-background px-3 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={loading || usersLoading}
              className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create Session"}
            </button>
          </form>
        </div>

        {/* Sessions */}
        <div className="rounded-xl border p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Telemedicine Sessions
            </h2>

            <p className="text-sm text-muted-foreground">
              View and manage remote consultations.
            </p>
          </div>

          {sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="font-medium">
                No telemedicine sessions
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Create a session using the form.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session._id}
                  className="rounded-lg border p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Remote Consultation
                      </h3>

                      <p className="mt-1 text-sm">
                        Patient:{" "}
                        {getPatientName(
                          session.patientId,
                        )}
                      </p>

                      <p className="text-sm">
                        Doctor:{" "}
                        {getDoctorName(
                          session.doctorId,
                        )}
                      </p>

                      <p className="mt-2 text-sm text-muted-foreground">
                        {new Date(
                          session.scheduledAt,
                        ).toLocaleString()}
                      </p>

                      {session.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Notes: {session.notes}
                        </p>
                      )}
                    </div>

                    <span className="rounded-full border px-3 py-1 text-xs">
                      {session.status}
                    </span>
                  </div>

                  {session.meetingUrl && (
                    <div className="mt-4">
                      <a
                        href={session.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary underline"
                      >
                        Join Video Consultation
                      </a>
                    </div>
                  )}

                  {/* Management controls are hidden from patients */}
                  {!isPatient && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {session.status === "scheduled" && (
                        <>
                          <button
                            onClick={() =>
                              updateStatus(
                                session._id,
                                "active",
                              )
                            }
                            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                          >
                            Start Consultation
                          </button>

                          <button
                            onClick={() =>
                              updateStatus(
                                session._id,
                                "cancelled",
                              )
                            }
                            className="rounded-md border px-3 py-2 text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {session.status === "active" && (
                        <button
                          onClick={() =>
                            updateStatus(
                              session._id,
                              "completed",
                            )
                          }
                          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                        >
                          Complete Consultation
                        </button>
                      )}

                      <button
                        onClick={() =>
                          deleteSession(session._id)
                        }
                        className="rounded-md border border-red-500/30 px-3 py-2 text-sm text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}