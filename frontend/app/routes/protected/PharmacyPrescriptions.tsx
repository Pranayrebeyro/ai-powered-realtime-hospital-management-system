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

type Medicine = {
  _id: string;
  name: string;
  quantity: number;
  status: string;
};

type User = {
  _id: string;
  name: string;
  email?: string;
  role: string;
};

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function PharmacyPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [patients, setPatients] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    medicineId: "",
    medicineName: "",
    dosage: "",
    frequency: "",
    duration: "",
    quantity: 1,
    instructions: "",
  });

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

  const loadMedicines = async () => {
    try {
      const response = await fetch(`${API_URL}/pharmacy`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load medicines");
      }

      const data = await response.json();
      setMedicines(data);
    } catch (error) {
      console.error("Failed to load medicines:", error);
    }
  };

  const loadUsers = async (role: "patient" | "doctor") => {
    try {
      const response = await fetch(
        `${API_URL}/users?role=${role}&limit=100`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load ${role}s`);
      }

      const data = await response.json();

      if (role === "patient") {
        setPatients(data.res || []);
      } else {
        setDoctors(data.res || []);
      }
    } catch (error) {
      console.error(`Failed to load ${role}s:`, error);
    }
  };

  useEffect(() => {
    loadPrescriptions();
    loadMedicines();
    loadUsers("patient");
    loadUsers("doctor");
  }, []);

  const handleMedicineChange = (medicineId: string) => {
    const selectedMedicine = medicines.find(
      (medicine) => medicine._id === medicineId,
    );

    if (!selectedMedicine) {
      setForm({
        ...form,
        medicineId: "",
        medicineName: "",
        quantity: 1,
      });

      return;
    }

    setForm({
      ...form,
      medicineId: selectedMedicine._id,
      medicineName: selectedMedicine.name,
      quantity: 1,
    });
  };

  const createPrescription = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.patientId) {
      alert("Please select a patient.");
      return;
    }

    if (!form.doctorId) {
      alert("Please select a doctor.");
      return;
    }

    if (!form.medicineId) {
      alert("Please select a medicine.");
      return;
    }

    const selectedMedicine = medicines.find(
      (medicine) => medicine._id === form.medicineId,
    );

    if (!selectedMedicine) {
      alert("Selected medicine was not found.");
      return;
    }

    if (selectedMedicine.quantity <= 0) {
      alert("This medicine is out of stock.");
      return;
    }

    if (form.quantity > selectedMedicine.quantity) {
      alert(
        `Only ${selectedMedicine.quantity} units of ${selectedMedicine.name} are available.`,
      );
      return;
    }

    try {
      const response = await fetch(`${API_URL}/prescriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          patientId: form.patientId,
          doctorId: form.doctorId,
          medicines: [
            {
              medicineId: form.medicineId,
              medicineName: form.medicineName,
              dosage: form.dosage,
              frequency: form.frequency,
              duration: form.duration,
              quantity: form.quantity,
            },
          ],
          instructions: form.instructions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create prescription");
      }

      setForm({
        patientId: "",
        doctorId: "",
        medicineId: "",
        medicineName: "",
        dosage: "",
        frequency: "",
        duration: "",
        quantity: 1,
        instructions: "",
      });

      setShowForm(false);

      await loadPrescriptions();
      await loadMedicines();

      alert("Prescription created successfully.");
    } catch (error) {
      console.error("Failed to create prescription:", error);
      alert("Failed to create prescription.");
    }
  };

  const deletePrescription = async (id: string) => {
    if (!confirm("Delete this prescription?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/prescriptions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete prescription");
      }

      await loadPrescriptions();

      alert("Prescription deleted successfully.");
    } catch (error) {
      console.error("Failed to delete prescription:", error);
      alert("Failed to delete prescription.");
    }
  };

  const availableMedicines = medicines.filter(
    (medicine) =>
      medicine.quantity > 0 &&
      medicine.status !== "out_of_stock" &&
      medicine.status !== "expired",
  );

  return (
    <div className="flex min-h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prescriptions</h1>

          <p className="text-muted-foreground">
            Manage patient prescriptions and medication instructions.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {showForm ? "Close Form" : "+ Add Prescription"}
        </button>
      </div>

      {/* Add Prescription Form */}
      {showForm && (
        <form
          onSubmit={createPrescription}
          className="grid gap-4 rounded-xl border bg-card p-6 md:grid-cols-2"
        >
          {/* Patient */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Patient
            </label>

            <select
              required
              value={form.patientId}
              onChange={(e) =>
                setForm({
                  ...form,
                  patientId: e.target.value,
                })
              }
              className="rounded-md border bg-background px-3 py-2"
            >
              <option value="">
                Select patient
              </option>

              {patients.map((patient) => (
                <option
                  key={patient._id}
                  value={patient._id}
                >
                  {patient.name} — {patient.email || patient._id}
                </option>
              ))}
            </select>

            {patients.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No patients found.
              </p>
            )}
          </div>

          {/* Doctor */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Doctor
            </label>

            <select
              required
              value={form.doctorId}
              onChange={(e) =>
                setForm({
                  ...form,
                  doctorId: e.target.value,
                })
              }
              className="rounded-md border bg-background px-3 py-2"
            >
              <option value="">
                Select doctor
              </option>

              {doctors.map((doctor) => (
                <option
                  key={doctor._id}
                  value={doctor._id}
                >
                  {doctor.name} — {doctor.email || doctor._id}
                </option>
              ))}
            </select>

            {doctors.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No doctors found.
              </p>
            )}
          </div>

          {/* Medicine */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Medicine
            </label>

            <select
              required
              value={form.medicineId}
              onChange={(e) =>
                handleMedicineChange(e.target.value)
              }
              className="rounded-md border bg-background px-3 py-2"
            >
              <option value="">
                Select medicine
              </option>

              {availableMedicines.map((medicine) => (
                <option
                  key={medicine._id}
                  value={medicine._id}
                >
                  {medicine.name} — {medicine.quantity} available
                </option>
              ))}
            </select>

            {availableMedicines.length === 0 && (
              <p className="text-sm text-destructive">
                No medicines are currently available.
              </p>
            )}
          </div>

          {/* Medicine Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Medicine Name
            </label>

            <input
              readOnly
              value={form.medicineName}
              placeholder="Selected medicine"
              className="rounded-md border bg-muted px-3 py-2"
            />
          </div>

          {/* Dosage */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Dosage
            </label>

            <input
              required
              placeholder="e.g. 500mg"
              value={form.dosage}
              onChange={(e) =>
                setForm({
                  ...form,
                  dosage: e.target.value,
                })
              }
              className="rounded-md border bg-background px-3 py-2"
            />
          </div>

          {/* Frequency */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Frequency
            </label>

            <input
              required
              placeholder="e.g. Twice daily"
              value={form.frequency}
              onChange={(e) =>
                setForm({
                  ...form,
                  frequency: e.target.value,
                })
              }
              className="rounded-md border bg-background px-3 py-2"
            />
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Duration
            </label>

            <input
              required
              placeholder="e.g. 5 days"
              value={form.duration}
              onChange={(e) =>
                setForm({
                  ...form,
                  duration: e.target.value,
                })
              }
              className="rounded-md border bg-background px-3 py-2"
            />
          </div>

          {/* Quantity */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Quantity
            </label>

            <input
              required
              type="number"
              min="1"
              max={
                medicines.find(
                  (medicine) =>
                    medicine._id === form.medicineId,
                )?.quantity || undefined
              }
              value={form.quantity}
              onChange={(e) =>
                setForm({
                  ...form,
                  quantity: Number(e.target.value),
                })
              }
              className="rounded-md border bg-background px-3 py-2"
            />
          </div>

          {/* Instructions */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium">
              Instructions
            </label>

            <textarea
              placeholder="Enter medication instructions"
              value={form.instructions}
              onChange={(e) =>
                setForm({
                  ...form,
                  instructions: e.target.value,
                })
              }
              rows={4}
              className="rounded-md border bg-background px-3 py-2"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={
                patients.length === 0 ||
                doctors.length === 0 ||
                availableMedicines.length === 0
              }
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Prescription
            </button>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Prescription List */}
      <div className="rounded-xl border bg-card p-6">
        {loading ? (
          <p className="text-muted-foreground">
            Loading prescriptions...
          </p>
        ) : prescriptions.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            No prescriptions found.
          </p>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((prescription) => (
              <div
                key={prescription._id}
                className="rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      Patient: {prescription.patientId}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Doctor: {prescription.doctorId}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Created:{" "}
                      {new Date(
                        prescription.createdAt,
                      ).toLocaleString()}
                    </p>
                  </div>

                  <span className="rounded-full border px-3 py-1 text-xs capitalize">
                    {prescription.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {prescription.medicines.map(
                    (medicine, index) => (
                      <div
                        key={`${prescription._id}-${index}`}
                        className="rounded-md bg-muted p-3"
                      >
                        <p className="font-medium">
                          {medicine.medicineName}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Dosage: {medicine.dosage}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Frequency: {medicine.frequency}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Duration: {medicine.duration}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Quantity: {medicine.quantity}
                        </p>
                      </div>
                    ),
                  )}
                </div>

                {prescription.instructions && (
                  <p className="mt-3 text-sm">
                    <strong>Instructions:</strong>{" "}
                    {prescription.instructions}
                  </p>
                )}

                <button
                  onClick={() =>
                    deletePrescription(
                      prescription._id,
                    )
                  }
                  className="mt-4 rounded-md border px-3 py-1 text-sm text-destructive"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}