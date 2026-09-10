import { useEffect, useState } from "react";

type Medicine = {
  _id: string;
  name: string;
  category: string;
  manufacturer?: string;
  batchNumber?: string;
  quantity: number;
  unitPrice: number;
  expiryDate?: string;
  reorderLevel: number;
  status: "available" | "low_stock" | "out_of_stock" | "expired";
};

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function PharmacyInventory() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "",
    manufacturer: "",
    batchNumber: "",
    quantity: 0,
    unitPrice: 0,
    expiryDate: "",
    reorderLevel: 10,
  });

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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  const addMedicine = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/pharmacy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to add medicine");
      }

      setForm({
        name: "",
        category: "",
        manufacturer: "",
        batchNumber: "",
        quantity: 0,
        unitPrice: 0,
        expiryDate: "",
        reorderLevel: 10,
      });

      setShowForm(false);
      await loadMedicines();
    } catch (error) {
      console.error(error);
      alert("Failed to add medicine");
    }
  };

  const deleteMedicine = async (id: string) => {
    if (!confirm("Delete this medicine?")) return;

    try {
      const response = await fetch(`${API_URL}/pharmacy/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete medicine");
      }

      await loadMedicines();
    } catch (error) {
      console.error(error);
      alert("Failed to delete medicine");
    }
  };

  const filteredMedicines = medicines.filter((medicine) =>
    `${medicine.name} ${medicine.category} ${medicine.manufacturer ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="flex min-h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pharmacy Inventory</h1>
          <p className="text-muted-foreground">
            Manage medicines and pharmacy stock.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          + Add Medicine
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={addMedicine}
          className="grid gap-4 rounded-xl border bg-card p-6 md:grid-cols-2"
        >
          <input
            required
            placeholder="Medicine name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            className="rounded-md border bg-background px-3 py-2"
          />

          <input
            required
            placeholder="Category"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value })
            }
            className="rounded-md border bg-background px-3 py-2"
          />

          <input
            placeholder="Manufacturer"
            value={form.manufacturer}
            onChange={(e) =>
              setForm({ ...form, manufacturer: e.target.value })
            }
            className="rounded-md border bg-background px-3 py-2"
          />

          <input
            placeholder="Batch number"
            value={form.batchNumber}
            onChange={(e) =>
              setForm({ ...form, batchNumber: e.target.value })
            }
            className="rounded-md border bg-background px-3 py-2"
          />

          <input
            type="number"
            min="0"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) =>
              setForm({
                ...form,
                quantity: Number(e.target.value),
              })
            }
            className="rounded-md border bg-background px-3 py-2"
          />

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Unit price"
            value={form.unitPrice}
            onChange={(e) =>
              setForm({
                ...form,
                unitPrice: Number(e.target.value),
              })
            }
            className="rounded-md border bg-background px-3 py-2"
          />

          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) =>
              setForm({
                ...form,
                expiryDate: e.target.value,
              })
            }
            className="rounded-md border bg-background px-3 py-2"
          />

          <input
            type="number"
            min="0"
            placeholder="Reorder level"
            value={form.reorderLevel}
            onChange={(e) =>
              setForm({
                ...form,
                reorderLevel: Number(e.target.value),
              })
            }
            className="rounded-md border bg-background px-3 py-2"
          />

          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Save Medicine
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

      <div className="rounded-xl border bg-card p-6">
        <input
          placeholder="Search medicines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-5 w-full rounded-md border bg-background px-3 py-2"
        />

        {loading ? (
          <p className="text-muted-foreground">Loading medicines...</p>
        ) : filteredMedicines.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            No medicines found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">Medicine</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Batch</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Expiry</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredMedicines.map((medicine) => (
                  <tr key={medicine._id} className="border-b">
                    <td className="p-3 font-medium">
                      {medicine.name}
                    </td>

                    <td className="p-3">
                      {medicine.category}
                    </td>

                    <td className="p-3">
                      {medicine.batchNumber || "-"}
                    </td>

                    <td className="p-3">
                      {medicine.quantity}
                    </td>

                    <td className="p-3">
                      ${medicine.unitPrice.toFixed(2)}
                    </td>

                    <td className="p-3">
                      {medicine.expiryDate
                        ? new Date(
                            medicine.expiryDate,
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    <td className="p-3">
                      {medicine.status}
                    </td>

                    <td className="p-3">
                      <button
                        onClick={() =>
                          deleteMedicine(medicine._id)
                        }
                        className="rounded-md border px-3 py-1 text-sm text-destructive"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}