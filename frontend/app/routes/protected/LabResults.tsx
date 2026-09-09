import { useEffect, useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing";
import { authClient } from "@/lib/auth-client";

const API_URL = "http://localhost:5000/api";

type Patient = {
  _id: string;
  name: string;
  email: string;
};

type LabResult = {
  _id: string;
  patient: string;
  uploadedBy: string;
  testType: string;
  bodyPart?: string;
  imageUrl?: string;
  aiAnalysis?: string;
  doctorNotes?: string;
  status: "pending" | "analyzed" | "reviewed";
  createdAt: string;
};

export default function LabResults() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [results, setResults] = useState<LabResult[]>([]);

  const [patientId, setPatientId] = useState("");
  const [testType, setTestType] = useState("X-Ray");
  const [bodyPart, setBodyPart] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  const loadPatients = async () => {
    try {
      const response = await fetch(
        `${API_URL}/users?role=patient&limit=100`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load patients");
      }

      const data = await response.json();

      setPatients(data.res || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load patients.");
    }
  };

  const loadResults = async (selectedPatientId: string) => {
    if (!selectedPatientId) {
      setResults([]);
      return;
    }

    try {
      setLoadingResults(true);

      const response = await fetch(
        `${API_URL}/lab-results/patient/${selectedPatientId}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load lab results");
      }

      const data = await response.json();

      setResults(data);
    } catch (error) {
      console.error(error);
      alert("Failed to load lab results.");
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    loadResults(patientId);
  }, [patientId]);

  const createResult = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!patientId || !testType) {
      alert("Please select a patient and test type.");
      return;
    }

    if (testType === "X-Ray" && !imageUrl) {
      alert("Please upload the X-Ray image first.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/lab-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          patientId,
          testType,
          bodyPart: bodyPart.trim(),
          imageUrl: imageUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create lab result",
        );
      }

      alert(
        testType === "X-Ray"
          ? "X-Ray uploaded successfully. AI analysis has been triggered."
          : "Lab result created successfully.",
      );

      setBodyPart("");
      setImageUrl("");

      await loadResults(patientId);
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to create lab result.",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateResult = async (
    id: string,
    updateData: {
      doctorNotes?: string;
      status?: "pending" | "analyzed" | "reviewed";
    },
  ) => {
    try {
      const response = await fetch(`${API_URL}/lab-results/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update lab result",
        );
      }

      await loadResults(patientId);
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update lab result.",
      );
    }
  };

  const getStatusClass = (
    status: LabResult["status"],
  ) => {
    if (status === "reviewed") {
      return "border-green-500/30 text-green-400";
    }

    if (status === "analyzed") {
      return "border-blue-500/30 text-blue-400";
    }

    return "border-yellow-500/30 text-yellow-400";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">
          Laboratory Results
        </h1>

        <p className="mt-1 text-muted-foreground">
          Upload X-Rays, view AI analysis, and add doctor notes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Upload Result */}
        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">
            New Lab Result
          </h2>

          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Upload a laboratory result for a patient.
          </p>

          <form
            onSubmit={createResult}
            className="space-y-4"
          >
            {/* Patient */}
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

            {/* Test Type */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Test Type *
              </label>

              <select
                value={testType}
                onChange={(event) => {
                  setTestType(event.target.value);

                  if (event.target.value !== "X-Ray") {
                    setImageUrl("");
                  }
                }}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                <option value="X-Ray">X-Ray</option>
                <option value="MRI">MRI</option>
                <option value="Blood Test">
                  Blood Test
                </option>
                <option value="CT Scan">
                  CT Scan
                </option>
                <option value="Ultrasound">
                  Ultrasound
                </option>
              </select>
            </div>

            {/* Body Part */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Body Part
              </label>

              <input
                value={bodyPart}
                onChange={(event) =>
                  setBodyPart(event.target.value)
                }
                placeholder="e.g. Chest"
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </div>

            {/* UploadThing */}
            {testType === "X-Ray" && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  X-Ray Image *
                </label>

                {!imageUrl ? (
                  <UploadDropzone
                    endpoint="imageUploader"
                    headers={async () => {
                      const session =
                        await authClient.getSession();

                      return {
                        Authorization: `Bearer ${session.data?.session.token}`,
                      };
                    }}
                    onClientUploadComplete={(res) => {
                      if (res?.[0]?.url) {
  setImageUrl(res[0].url);
                        alert(
                          "X-Ray image uploaded successfully.",
                        );
                      }
                    }}
                    onUploadError={(error: Error) => {
                      console.error(
                        "UploadThing error:",
                        error,
                      );

                      alert(
                        `Upload failed: ${error.message}`,
                      );
                    }}
                    className="border-dashed border-slate-300 dark:border-slate-500 ut-label:text-blue-600"
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-lg border bg-black">
                      <img
                        src={imageUrl}
                        alt="Uploaded X-Ray"
                        className="h-48 w-full object-contain"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="text-sm text-green-400">
                        X-Ray uploaded successfully
                      </span>

                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="text-sm text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Create */}
            <button
              type="submit"
              disabled={
                loading ||
                (testType === "X-Ray" && !imageUrl)
              }
              className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create Lab Result"}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="rounded-xl border p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Results
            </h2>

            <p className="text-sm text-muted-foreground">
              Select a patient to view their laboratory results.
            </p>
          </div>

          {!patientId ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="font-medium">
                Select a patient
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Choose a patient from the form to view results.
              </p>
            </div>
          ) : loadingResults ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading results...
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="font-medium">
                No laboratory results
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                No results have been uploaded for this patient.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {results.map((result) => (
                <LabResultCard
                  key={result._id}
                  result={result}
                  onUpdate={updateResult}
                  statusClass={getStatusClass(
                    result.status,
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type LabResultCardProps = {
  result: LabResult;
  onUpdate: (
    id: string,
    data: {
      doctorNotes?: string;
      status?: "pending" | "analyzed" | "reviewed";
    },
  ) => Promise<void>;
  statusClass: string;
};

function LabResultCard({
  result,
  onUpdate,
  statusClass,
}: LabResultCardProps) {
  const [doctorNotes, setDoctorNotes] = useState(
    result.doctorNotes || "",
  );

  const saveNotes = async () => {
    await onUpdate(result._id, {
      doctorNotes,
    });

    alert("Doctor notes saved successfully.");
  };

  const markReviewed = async () => {
    await onUpdate(result._id, {
      doctorNotes,
      status: "reviewed",
    });

    alert("Lab result marked as reviewed.");
  };

  return (
    <div className="rounded-lg border p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {result.testType}
          </h3>

          {result.bodyPart && (
            <p className="text-sm text-muted-foreground">
              Body Part: {result.bodyPart}
            </p>
          )}

          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(
              result.createdAt,
            ).toLocaleString()}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs ${statusClass}`}
        >
          {result.status}
        </span>
      </div>

      {result.imageUrl && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium">
            Medical Image
          </p>

          <div className="mb-3 overflow-hidden rounded-lg border bg-black">
            <img
              src={result.imageUrl}
              alt={`${result.testType} - ${result.bodyPart || "Medical Image"}`}
              className="max-h-80 w-full object-contain"
            />
          </div>

          <a
            href={result.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline"
          >
            Open Full Medical Image
          </a>
        </div>
      )}

      <div className="mt-5 rounded-lg border p-4">
        <p className="mb-2 text-sm font-medium">
          AI Analysis
        </p>

        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {result.aiAnalysis ||
            "Pending Analysis..."}
        </p>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-medium">
          Doctor Notes
        </label>

        <textarea
          value={doctorNotes}
          onChange={(event) =>
            setDoctorNotes(event.target.value)
          }
          rows={4}
          placeholder="Enter doctor's conclusion..."
          className="w-full resize-none rounded-md border bg-background px-3 py-2"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={saveNotes}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Save Notes
        </button>

        {result.status !== "reviewed" && (
          <button
            onClick={markReviewed}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Mark Reviewed
          </button>
        )}
      </div>
    </div>
  );
}