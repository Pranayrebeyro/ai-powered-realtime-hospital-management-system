import { useEffect, useState } from "react";

type PrescriptionMedicine = {
  medicineId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
};

type Prescription = {
  _id: string;
  patientId: string;
  doctorId: string;
  medicines: PrescriptionMedicine[];
  instructions?: string;
  status: "active" | "dispensed" | "cancelled";
  createdAt: string;
};

const API_URL = "http://localhost:5000/api";

export default function PharmacyDispense() {
  const [prescriptions, setPrescriptions] = useState<
    Prescription[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [dispensingId, setDispensingId] = useState<string | null>(
    null,
  );

  const loadPrescriptions = async () => {
    try {
      const response = await fetch(`${API_URL}/prescriptions`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load prescriptions");
      }

      const data = await response.json();
      setPrescriptions(data);
    } catch (error) {
      console.error("Failed to load prescriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const dispensePrescription = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to dispense this prescription?",
      )
    ) {
      return;
    }

    try {
      setDispensingId(id);

      const response = await fetch(
        `${API_URL}/prescriptions/${id}/dispense`,
        {
          method: "PUT",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to dispense prescription",
        );
      }

      await loadPrescriptions();

      alert("Prescription dispensed successfully.");
    } catch (error) {
      console.error(
        "Failed to dispense prescription:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to dispense prescription.",
      );
    } finally {
      setDispensingId(null);
    }
  };

  const activePrescriptions = prescriptions.filter(
    (prescription) => prescription.status === "active",
  );

  const dispensedPrescriptions = prescriptions.filter(
    (prescription) => prescription.status === "dispensed",
  );

  return (
    <div className="flex min-h-full flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Dispense Medicines
        </h1>

        <p className="text-muted-foreground">
          Review prescriptions and dispense medicines to patients.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Pending Dispensing
          </p>

          <p className="mt-2 text-3xl font-bold">
            {activePrescriptions.length}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Already Dispensed
          </p>

          <p className="mt-2 text-3xl font-bold">
            {dispensedPrescriptions.length}
          </p>
        </div>
      </div>

      {/* Prescription List */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            Pending Prescriptions
          </h2>

          <p className="text-sm text-muted-foreground">
            Prescriptions that are ready to be dispensed.
          </p>
        </div>

        {loading ? (
          <p className="py-10 text-center text-muted-foreground">
            Loading prescriptions...
          </p>
        ) : activePrescriptions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="font-medium">
              No prescriptions pending.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              All active prescriptions have been dispensed.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {activePrescriptions.map((prescription) => (
              <div
                key={prescription._id}
                className="rounded-lg border p-5"
              >
                {/* Patient / Doctor */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">
                      Patient ID: {prescription.patientId}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Doctor ID: {prescription.doctorId}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Created:{" "}
                      {new Date(
                        prescription.createdAt,
                      ).toLocaleString()}
                    </p>
                  </div>

                  <span className="w-fit rounded-full border px-3 py-1 text-xs capitalize">
                    {prescription.status}
                  </span>
                </div>

                {/* Medicines */}
                <div className="mt-5">
                  <h3 className="mb-3 text-sm font-semibold">
                    Medicines
                  </h3>

                  <div className="space-y-2">
                    {prescription.medicines.map(
                      (medicine, index) => (
                        <div
                          key={`${prescription._id}-${index}`}
                          className="rounded-md bg-muted p-4"
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-medium">
                                {medicine.medicineName}
                              </p>

                              <p className="text-sm text-muted-foreground">
                                Dosage: {medicine.dosage}
                              </p>

                              <p className="text-sm text-muted-foreground">
                                Frequency:{" "}
                                {medicine.frequency}
                              </p>

                              <p className="text-sm text-muted-foreground">
                                Duration:{" "}
                                {medicine.duration}
                              </p>
                            </div>

                            <div className="text-sm">
                              <span className="text-muted-foreground">
                                Quantity:
                              </span>{" "}
                              <strong>
                                {medicine.quantity}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Instructions */}
                {prescription.instructions && (
                  <div className="mt-4 rounded-md border p-3">
                    <p className="text-sm">
                      <strong>Instructions:</strong>{" "}
                      {prescription.instructions}
                    </p>
                  </div>
                )}

                {/* Dispense Button */}
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() =>
                      dispensePrescription(
                        prescription._id,
                      )
                    }
                    disabled={
                      dispensingId === prescription._id
                    }
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {dispensingId === prescription._id
                      ? "Dispensing..."
                      : "Dispense Medicines"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dispensed History */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            Dispensed History
          </h2>

          <p className="text-sm text-muted-foreground">
            Previously dispensed prescriptions.
          </p>
        </div>

        {dispensedPrescriptions.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No dispensed prescriptions yet.
          </p>
        ) : (
          <div className="space-y-3">
            {dispensedPrescriptions.map((prescription) => (
              <div
                key={prescription._id}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">
                    Patient: {prescription.patientId}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Doctor: {prescription.doctorId}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {prescription.medicines
                      .map(
                        (medicine) =>
                          `${medicine.medicineName} × ${medicine.quantity}`,
                      )
                      .join(", ")}
                  </p>
                </div>

                <span className="w-fit rounded-full border px-3 py-1 text-xs capitalize">
                  {prescription.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}