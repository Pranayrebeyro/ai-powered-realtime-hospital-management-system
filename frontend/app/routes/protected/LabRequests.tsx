import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type User = {
  _id: string;
  name: string;
  email: string;
};

type LabRequest = {
  _id: string;
  patientId: string;
  doctorId: string;
  testName: string;
  testType: string;
  priority: "normal" | "urgent";
  status: "requested" | "processing" | "completed" | "cancelled";
  notes?: string;
  createdAt: string;
};

export default function LabRequests() {
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [patients, setPatients] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);

  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [testName, setTestName] = useState("");
  const [testType, setTestType] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">(
    "normal",
  );
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [requestsRes, patientsRes, doctorsRes] =
        await Promise.all([
          fetch(`${API_URL}/lab-requests`, {
            credentials: "include",
          }),
          fetch(
            `${API_URL}/users?role=patient&limit=100`,
            {
              credentials: "include",
            },
          ),
          fetch(
            `${API_URL}/users?role=doctor&limit=100`,
            {
              credentials: "include",
            },
          ),
        ]);

      if (!requestsRes.ok) {
        throw new Error("Failed to load lab requests");
      }

      if (!patientsRes.ok || !doctorsRes.ok) {
        throw new Error("Failed to load users");
      }

      const requestsData = await requestsRes.json();
      const patientsData = await patientsRes.json();
      const doctorsData = await doctorsRes.json();

      setRequests(requestsData);
      setPatients(patientsData.res || []);
      setDoctors(doctorsData.res || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load laboratory data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createRequest = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !patientId ||
      !doctorId ||
      !testName.trim() ||
      !testType.trim()
    ) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `${API_URL}/lab-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            patientId,
            doctorId,
            testName: testName.trim(),
            testType: testType.trim(),
            priority,
            notes: notes.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create lab request",
        );
      }

      alert("Lab request created successfully.");

      setPatientId("");
      setDoctorId("");
      setTestName("");
      setTestType("");
      setPriority("normal");
      setNotes("");

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to create lab request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (
    id: string,
    status: LabRequest["status"],
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/lab-requests/${id}`,
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
          data.message || "Failed to update status",
        );
      }

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update request.",
      );
    }
  };

  const deleteRequest = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lab request?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/lab-requests/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete request",
        );
      }

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete request.",
      );
    }
  };

  const getUserName = (id: string) => {
    const user = [...patients, ...doctors].find(
      (item) => item._id === id,
    );

    return user
      ? `${user.name} — ${user.email}`
      : id;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">
          Laboratory Test Requests
        </h1>

        <p className="mt-1 text-muted-foreground">
          Create and manage laboratory test requests.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Create Request */}
        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">
            New Test Request
          </h2>

          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Request a laboratory test for a patient.
          </p>

          <form
            onSubmit={createRequest}
            className="space-y-4"
          >
            <div>
              <label className="mb-2 block text-sm font-medium">
                Patient *
              </label>

              <select
                value={patientId}
                onChange={(event) =>
                  setPatientId(event.target.value)
                }
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
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Doctor *
              </label>

              <select
                value={doctorId}
                onChange={(event) =>
                  setDoctorId(event.target.value)
                }
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
                    {doctor.name} — {doctor.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Test Name *
              </label>

              <input
                value={testName}
                onChange={(event) =>
                  setTestName(event.target.value)
                }
                placeholder="e.g. Complete Blood Count"
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Test Type *
              </label>

              <input
                value={testType}
                onChange={(event) =>
                  setTestType(event.target.value)
                }
                placeholder="e.g. Blood Test"
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Priority
              </label>

              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target.value as
                      | "normal"
                      | "urgent",
                  )
                }
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                <option value="normal">
                  Normal
                </option>

                <option value="urgent">
                  Urgent
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Additional instructions..."
                rows={4}
                className="w-full resize-none rounded-md border bg-background px-3 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
            >
              {submitting
                ? "Creating..."
                : "Create Test Request"}
            </button>
          </form>
        </div>

        {/* Requests */}
        <div className="rounded-xl border p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Test Requests
              </h2>

              <p className="text-sm text-muted-foreground">
                Laboratory requests submitted by doctors.
              </p>
            </div>

            <div className="rounded-lg border px-4 py-2 text-center">
              <div className="text-2xl font-semibold">
                {requests.length}
              </div>

              <div className="text-xs text-muted-foreground">
                Total
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading test requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="font-medium">
                No test requests
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Create a test request using the form.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className="rounded-lg border p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {request.testName}
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        {request.testType}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <span className="rounded-full border px-3 py-1 text-xs">
                        {request.priority}
                      </span>

                      <span className="rounded-full border px-3 py-1 text-xs">
                        {request.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">
                        Patient:
                      </span>{" "}
                      {getUserName(request.patientId)}
                    </div>

                    <div>
                      <span className="text-muted-foreground">
                        Doctor:
                      </span>{" "}
                      {getUserName(request.doctorId)}
                    </div>

                    <div>
                      <span className="text-muted-foreground">
                        Requested:
                      </span>{" "}
                      {new Date(
                        request.createdAt,
                      ).toLocaleString()}
                    </div>
                  </div>

                  {request.notes && (
                    <div className="mt-4 rounded-md border p-3 text-sm">
                      <span className="font-medium">
                        Notes:
                      </span>{" "}
                      {request.notes}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {request.status === "requested" && (
                      <button
                        onClick={() =>
                          updateStatus(
                            request._id,
                            "processing",
                          )
                        }
                        className="rounded-md border px-3 py-2 text-sm"
                      >
                        Start Processing
                      </button>
                    )}

                    {request.status === "processing" && (
                      <button
                        onClick={() =>
                          updateStatus(
                            request._id,
                            "completed",
                          )
                        }
                        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                      >
                        Mark Completed
                      </button>
                    )}

                    {request.status !== "completed" &&
                      request.status !== "cancelled" && (
                        <button
                          onClick={() =>
                            updateStatus(
                              request._id,
                              "cancelled",
                            )
                          }
                          className="rounded-md border px-3 py-2 text-sm"
                        >
                          Cancel
                        </button>
                      )}

                    <button
                      onClick={() =>
                        deleteRequest(request._id)
                      }
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}