import type {
  PaginatedResponse,
  Role,
  User,
  LabResult,
  WebPushSubscription,
  ActivityLog,
  invoice,
  appointment,
} from "@/types";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getUsers = async (params: {
  role: Role;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<User>> => {
  const query = new URLSearchParams({
    role: params.role,
    page: (params.page || 1).toString(),
    limit: (params.limit || 10).toString(),
  }).toString();

  const res = await fetch(`${API_URL}/users?${query}`, {
    credentials: "include", // Important for Better Auth cookies
  });

  if (!res.ok) throw new Error("Failed");

  return res.json();
};

export const triggerAdmission = async ({
  patientId,
  admissionReason,
}: {
  patientId: string;
  admissionReason: string;
}) => {
  // /:id/admit
  const res = await fetch(`${API_URL}/users/${patientId}/admit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admissionReason }),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to start admission process");
  return res.json();
};

interface UpdateUserParams {
  userId: string;
  userData: Partial<User> & Record<string, any>; // Allow custom fields
}

// /update/:id
export const updateUser = async ({ userId, userData }: UpdateUserParams) => {
  const res = await fetch(`${API_URL}/users/update/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
    credentials: "include", // Important for Better Auth cookies
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to update user");
  }

  return res.json();
};

export const createActityLog = async (data: {
  userId: string;
  action: string;
  details?: string;
}) => {
  const res = await fetch(`${API_URL}/activity-logs/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include", // Important for Better Auth cookies
  });
  if (!res.ok) throw new Error("Failed to create activity log");
  return res.json();
};

export const getPatientLabResults = async (
  patientId: string,
): Promise<LabResult[]> => {
  const res = await fetch(`${API_URL}/lab-results/patient/${patientId}`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch lab results");
  return res.json();
};

export const updateLabResult = async ({
  id,
  data,
}: {
  id: string;
  data: { doctorNotes?: string; status?: string };
}) => {
  const res = await fetch(`${API_URL}/lab-results/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to update lab result");
  return res.json();
};

export const createLabResult = async (data: {
  patientId: string;
  testType: string;
  bodyPart: string;
  imageUrl: string;
  aiAnalysis?: string;
}) => {
  const res = await fetch(`${API_URL}/lab-results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include", // Important for Better Auth cookies
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to create lab result");
  }

  return res.json();
};

export const deleteFile = async ({ file }: { file: string }) => {
  const res = await fetch(`${API_URL}/uploadthing/delete`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileUrl: file }),
    credentials: "include", // Important for Better Auth cookies
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to delete file");
  }

  return res.json();
};

export const getActivityLogs = async (params: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<ActivityLog>> => {
  const query = new URLSearchParams({
    page: (params.page || 1).toString(),
    limit: (params.limit || 10).toString(),
  }).toString();

  const res = await fetch(`${API_URL}/activity-logs?${query}`, {
    credentials: "include", // Important for Better Auth cookies
  });

  if (!res.ok) throw new Error("Failed to fetch activity logs");

  return res.json();
};

export const getUserById = async (userId: string) => {
  const res = await fetch(`${API_URL}/users/profile/${userId}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
};

export const getMyActiveInvoice = async () => {
  const res = await fetch(`${API_URL}/invoices/my-active-invoice`, {
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 404) return null; // No active invoice
    throw new Error("Failed to fetch invoice");
  }
  return res.json();
};

export const createCheckoutSession = async (invoiceId: string) => {
  const res = await fetch(`${API_URL}/invoices/${invoiceId}/checkout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to initiate checkout");
  return res.json();
};

export const getBillingHistory = async () => {
  const res = await fetch(`${API_URL}/invoices/history`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch billing history");
  }

  return res.json();
};

export const getAllInvoices = async (data?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<invoice>> => {
  const params = new URLSearchParams();

  if (data?.page) {
    params.set("page", String(data.page));
  }

  if (data?.limit) {
    params.set("limit", String(data.limit));
  }

  const query = params.toString();

  const res = await fetch(
    `${API_URL}/invoices${query ? `?${query}` : ""}`,
    {
      credentials: "include",
    }
  );

  if (!res.ok) throw new Error("Failed to fetch invoices");

  return res.json();
};

export const polarPortalLink = async (userId: string) => {
  const res = await fetch(`${API_URL}/users/polar-portal/${userId}`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch polar portal link");
  return res.json();
};

export const fetchNotifications = async () => {
  const res = await fetch(`${API_URL}/notifications`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json(); // Expected response: { notifications:[], unreadCount: 0 }
};

export const markAsRead = async (id: string) => {
  const res = await fetch(`${API_URL}/notifications/${id}/read`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark as read");
  return res.json();
};
