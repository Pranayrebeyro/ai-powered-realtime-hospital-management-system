import { useEffect, useState } from "react";

type BillingSettings = {
  taxEnabled: boolean;
  taxPercentage: number;
  consultationFee: number;
  xrayFee: number;
  laboratoryFee: number;
  pharmacyFee: number;
  paymentProvider: "polar";
  paymentMode: "sandbox" | "production";
  autoGenerateInvoice: boolean;
};

const defaultBilling: BillingSettings = {
  taxEnabled: false,
  taxPercentage: 0,
  consultationFee: 0,
  xrayFee: 150,
  laboratoryFee: 0,
  pharmacyFee: 0,
  paymentProvider: "polar",
  paymentMode: "sandbox",
  autoGenerateInvoice: true,
};

export default function SettingsBilling() {
  const [settings, setSettings] =
    useState<BillingSettings>(defaultBilling);

  const [hospitalName, setHospitalName] = useState(
    "MedFlow AI Hospital",
  );

  const [hospitalEmail, setHospitalEmail] = useState("");
  const [hospitalPhone, setHospitalPhone] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");
  const [dateFormat, setDateFormat] =
    useState("DD/MM/YYYY");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://localhost:5000/api/settings",
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to load billing settings");
        }

        const data = await response.json();

        setHospitalName(
          data.hospitalName || "MedFlow AI Hospital",
        );

        setHospitalEmail(data.hospitalEmail || "");
        setHospitalPhone(data.hospitalPhone || "");
        setHospitalAddress(data.hospitalAddress || "");
        setTimezone(data.timezone || "Asia/Kolkata");
        setCurrency(data.currency || "INR");
        setDateFormat(data.dateFormat || "DD/MM/YYYY");

        setSettings({
          taxEnabled: data.taxEnabled ?? false,
          taxPercentage: data.taxPercentage ?? 0,

          consultationFee:
            data.consultationFee !== undefined
              ? data.consultationFee / 100
              : 0,

          xrayFee:
            data.xrayFee !== undefined
              ? data.xrayFee / 100
              : 150,

          laboratoryFee:
            data.laboratoryFee !== undefined
              ? data.laboratoryFee / 100
              : 0,

          pharmacyFee:
            data.pharmacyFee !== undefined
              ? data.pharmacyFee / 100
              : 0,

          paymentProvider:
            data.paymentProvider || "polar",

          paymentMode:
            data.paymentMode || "sandbox",

          autoGenerateInvoice:
            data.autoGenerateInvoice ?? true,
        });
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load settings",
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateField = <
    K extends keyof BillingSettings,
  >(
    field: K,
    value: BillingSettings[K],
  ) => {
    setSettings((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await fetch(
        "http://localhost:5000/api/settings",
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            hospitalName,
            hospitalEmail,
            hospitalPhone,
            hospitalAddress,
            timezone,
            currency,
            dateFormat,

            taxEnabled: settings.taxEnabled,

            taxPercentage:
              Number(settings.taxPercentage) || 0,

            /*
             * Convert rupees to the smallest currency unit.
             *
             * Example:
             * ₹500 → 50000
             */
            consultationFee:
              Math.round(
                Number(settings.consultationFee) * 100,
              ),

            xrayFee:
              Math.round(
                Number(settings.xrayFee) * 100,
              ),

            laboratoryFee:
              Math.round(
                Number(settings.laboratoryFee) * 100,
              ),

            pharmacyFee:
              Math.round(
                Number(settings.pharmacyFee) * 100,
              ),

            paymentProvider:
              settings.paymentProvider,

            paymentMode:
              settings.paymentMode,

            autoGenerateInvoice:
              settings.autoGenerateInvoice,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(
          () => null,
        );

        throw new Error(
          data?.message ||
            "Failed to save billing settings",
        );
      }

      const data = await response.json();

      setSettings((previous) => ({
        ...previous,

        consultationFee:
          (data.consultationFee ?? 0) / 100,

        xrayFee:
          (data.xrayFee ?? 0) / 100,

        laboratoryFee:
          (data.laboratoryFee ?? 0) / 100,

        pharmacyFee:
          (data.pharmacyFee ?? 0) / 100,
      }));

      setMessage("Billing settings saved successfully.");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save billing settings",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Loading billing settings...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Billing Settings
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Configure hospital charges, taxes and payment
          settings.
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Currency */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">
          Currency
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Billing amounts will use the currency configured
          here.
        </p>

        <div className="mt-4 max-w-md">
          <label className="mb-2 block text-sm font-medium">
            Currency
          </label>

          <select
            value={currency}
            onChange={(event) =>
              setCurrency(event.target.value)
            }
            className="w-full rounded-lg border bg-background px-3 py-2"
          >
            <option value="INR">
              INR (₹)
            </option>

            <option value="USD">
              USD ($)
            </option>

            <option value="EUR">
              EUR (€)
            </option>

            <option value="GBP">
              GBP (£)
            </option>
          </select>
        </div>
      </section>

      {/* Tax */}
      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Tax Configuration
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Configure tax applied to hospital invoices.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={settings.taxEnabled}
              onChange={(event) =>
                updateField(
                  "taxEnabled",
                  event.target.checked,
                )
              }
              className="h-4 w-4"
            />

            <span className="text-sm font-medium">
              Enable tax
            </span>
          </label>
        </div>

        {settings.taxEnabled && (
          <div className="mt-5 max-w-md">
            <label className="mb-2 block text-sm font-medium">
              Tax Percentage
            </label>

            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.taxPercentage}
                onChange={(event) =>
                  updateField(
                    "taxPercentage",
                    Number(event.target.value),
                  )
                }
                className="w-full rounded-lg border bg-background px-3 py-2 pr-10"
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Hospital Charges */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">
          Hospital Charges
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Configure default charges used when creating
          invoices.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Consultation Fee
            </label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                ₹
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.consultationFee}
                onChange={(event) =>
                  updateField(
                    "consultationFee",
                    Number(event.target.value),
                  )
                }
                className="w-full rounded-lg border bg-background px-3 py-2 pl-8"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              X-Ray Fee
            </label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                ₹
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.xrayFee}
                onChange={(event) =>
                  updateField(
                    "xrayFee",
                    Number(event.target.value),
                  )
                }
                className="w-full rounded-lg border bg-background px-3 py-2 pl-8"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Laboratory Fee
            </label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                ₹
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.laboratoryFee}
                onChange={(event) =>
                  updateField(
                    "laboratoryFee",
                    Number(event.target.value),
                  )
                }
                className="w-full rounded-lg border bg-background px-3 py-2 pl-8"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Pharmacy Fee
            </label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                ₹
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.pharmacyFee}
                onChange={(event) =>
                  updateField(
                    "pharmacyFee",
                    Number(event.target.value),
                  )
                }
                className="w-full rounded-lg border bg-background px-3 py-2 pl-8"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Payment */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">
          Payment Configuration
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Configure the payment provider used for online
          payments.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Payment Provider
            </label>

            <select
              value={settings.paymentProvider}
              onChange={(event) =>
                updateField(
                  "paymentProvider",
                  event.target
                    .value as "polar",
                )
              }
              className="w-full rounded-lg border bg-background px-3 py-2"
            >
              <option value="polar">
                Polar
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Payment Mode
            </label>

            <select
              value={settings.paymentMode}
              onChange={(event) =>
                updateField(
                  "paymentMode",
                  event.target.value as
                    | "sandbox"
                    | "production",
                )
              }
              className="w-full rounded-lg border bg-background px-3 py-2"
            >
              <option value="sandbox">
                Sandbox
              </option>

              <option value="production">
                Production
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* Invoice */}
      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Invoice Settings
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Automatically create invoices when billable
              services are added.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={settings.autoGenerateInvoice}
              onChange={(event) =>
                updateField(
                  "autoGenerateInvoice",
                  event.target.checked,
                )
              }
              className="h-4 w-4"
            />

            <span className="text-sm font-medium">
              Auto-generate invoices
            </span>
          </label>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save Billing Settings"}
        </button>
      </div>
    </div>
  );
}