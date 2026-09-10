import { useEffect, useState } from "react";

type Settings = {
  hospitalName: string;
  hospitalEmail: string;
  hospitalPhone: string;
  hospitalAddress: string;
  timezone: string;
  currency: string;
  dateFormat: string;
};

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const SettingsGeneral = () => {
  const [settings, setSettings] = useState<Settings>({
    hospitalName: "",
    hospitalEmail: "",
    hospitalPhone: "",
    hospitalAddress: "",
    timezone: "Asia/Kolkata",
    currency: "USD",
    dateFormat: "DD/MM/YYYY",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/settings`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load settings");
        }

        const data = await response.json();
        setSettings(data);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load settings.");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    setSettings((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save settings");
      }

      setSettings(data);
      setMessage("Settings saved successfully.");
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">General Settings</h1>
        <p className="text-muted-foreground">
          Manage your hospital's general information and regional preferences.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="max-w-3xl space-y-6 rounded-xl border bg-card p-6 shadow-sm"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="hospitalName" className="text-sm font-medium">
              Hospital Name
            </label>

            <input
              id="hospitalName"
              name="hospitalName"
              value={settings.hospitalName}
              onChange={handleChange}
              placeholder="Enter hospital name"
              className="w-full rounded-md border bg-background px-3 py-2"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="hospitalEmail" className="text-sm font-medium">
              Hospital Email
            </label>

            <input
              id="hospitalEmail"
              name="hospitalEmail"
              type="email"
              value={settings.hospitalEmail}
              onChange={handleChange}
              placeholder="hospital@example.com"
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="hospitalPhone" className="text-sm font-medium">
              Hospital Phone
            </label>

            <input
              id="hospitalPhone"
              name="hospitalPhone"
              value={settings.hospitalPhone}
              onChange={handleChange}
              placeholder="+91 XXXXX XXXXX"
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="hospitalAddress" className="text-sm font-medium">
              Hospital Address
            </label>

            <input
              id="hospitalAddress"
              name="hospitalAddress"
              value={settings.hospitalAddress}
              onChange={handleChange}
              placeholder="Enter hospital address"
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="timezone" className="text-sm font-medium">
              Timezone
            </label>

            <select
              id="timezone"
              name="timezone"
              value={settings.timezone}
              onChange={handleChange}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="Asia/Singapore">Asia/Singapore</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="currency" className="text-sm font-medium">
              Currency
            </label>

            <select
              id="currency"
              name="currency"
              value={settings.currency}
              onChange={handleChange}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AED">AED</option>
              <option value="SGD">SGD</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="dateFormat" className="text-sm font-medium">
              Date Format
            </label>

            <select
              id="dateFormat"
              name="dateFormat"
              value={settings.dateFormat}
              onChange={handleChange}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>

        {message && (
          <div className="rounded-md border px-4 py-3 text-sm">
            {message}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsGeneral;