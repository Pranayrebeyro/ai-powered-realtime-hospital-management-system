import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  LifeBuoy,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type TicketCategory =
  | "technical"
  | "billing"
  | "account"
  | "medical"
  | "other";

type TicketPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

type TicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";

interface SupportTicket {
  _id: string;
  userId: string;
  subject: string;
  category: TicketCategory;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
}

const categoryLabels: Record<TicketCategory, string> = {
  technical: "Technical",
  billing: "Billing",
  account: "Account",
  medical: "Medical",
  other: "Other",
};

const priorityLabels: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const getStatusIcon = (status: TicketStatus) => {
  if (status === "resolved") {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (status === "in_progress") {
    return <Clock className="h-4 w-4" />;
  }

  if (status === "closed") {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  return <AlertCircle className="h-4 w-4" />;
};

const getStatusClass = (status: TicketStatus) => {
  switch (status) {
    case "resolved":
      return "bg-green-100 text-green-700";
    case "in_progress":
      return "bg-blue-100 text-blue-700";
    case "closed":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
};

const getPriorityClass = (priority: TicketPriority) => {
  switch (priority) {
    case "urgent":
      return "text-red-600";
    case "high":
      return "text-orange-600";
    case "medium":
      return "text-yellow-600";
    default:
      return "text-green-600";
  }
};

export default function Support() {
  const { data: session, isPending: sessionPending } =
    authClient.useSession();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [subject, setSubject] = useState("");
  const [category, setCategory] =
    useState<TicketCategory>("technical");
  const [description, setDescription] = useState("");
  const [priority, setPriority] =
    useState<TicketPriority>("medium");
  const [submitting, setSubmitting] = useState(false);

  const userRole = session?.user?.role;

  const isAdmin = userRole === "admin";

  const loadTickets = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/support`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load support tickets");
      }

      const data = await response.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionPending && session) {
      loadTickets();
    }
  }, [sessionPending, session]);

  const resetForm = () => {
    setSubject("");
    setCategory("technical");
    setDescription("");
    setPriority("medium");
  };

  const createTicket = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `${API_URL}/support`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: subject.trim(),
            category,
            description: description.trim(),
            priority,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to create support ticket",
        );
      }

      toast.success("Support ticket created successfully");

      setDialogOpen(false);
      resetForm();
      await loadTickets();
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create support ticket",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const updateTicket = async (
    id: string,
    updates: Partial<SupportTicket>,
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/support/${id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to update ticket",
        );
      }

      toast.success("Support ticket updated");

      await loadTickets();
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update ticket",
      );
    }
  };

  const deleteTicket = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this support ticket?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/support/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to delete ticket",
        );
      }

      toast.success("Support ticket deleted");

      await loadTickets();
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete ticket",
      );
    }
  };

  if (sessionPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">
          Loading support...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-7 w-7" />
            <h1 className="text-2xl font-bold">
              Support
            </h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Create and track support requests.
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Support Ticket
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>
                Create Support Ticket
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="subject">
                  Subject
                </Label>

                <Input
                  id="subject"
                  placeholder="Describe your issue"
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                  maxLength={200}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>

                  <Select
                    value={category}
                    onValueChange={(value) =>
                      setCategory(
                        value as TicketCategory,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {Object.entries(
                        categoryLabels,
                      ).map(([value, label]) => (
                        <SelectItem
                          key={value}
                          value={value}
                        >
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>

                  <Select
                    value={priority}
                    onValueChange={(value) =>
                      setPriority(
                        value as TicketPriority,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {Object.entries(
                        priorityLabels,
                      ).map(([value, label]) => (
                        <SelectItem
                          key={value}
                          value={value}
                        >
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description
                </Label>

                <Textarea
                  id="description"
                  placeholder="Explain the issue in detail..."
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  rows={6}
                  maxLength={5000}
                />
              </div>

              <Button
                className="w-full"
                onClick={createTicket}
                disabled={submitting}
              >
                {submitting
                  ? "Creating..."
                  : "Create Ticket"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex min-h-[250px] items-center justify-center">
            <p className="text-muted-foreground">
              Loading support tickets...
            </p>
          </CardContent>
        </Card>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <LifeBuoy className="mb-4 h-12 w-12 text-muted-foreground" />

            <h2 className="text-lg font-semibold">
              No support tickets
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Create a ticket if you need assistance.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket._id}>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {ticket.subject}
                    </CardTitle>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {categoryLabels[ticket.category]}{" "}
                      ·{" "}
                      {new Date(
                        ticket.createdAt,
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                        ticket.status,
                      )}`}
                    >
                      {getStatusIcon(ticket.status)}
                      {statusLabels[ticket.status]}
                    </span>

                    <span
                      className={`rounded-full bg-muted px-3 py-1 text-xs font-medium ${getPriorityClass(
                        ticket.priority,
                      )}`}
                    >
                      {priorityLabels[ticket.priority]}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="whitespace-pre-wrap text-sm">
                    {ticket.description}
                  </p>
                </div>

                {ticket.adminResponse && (
                  <div className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      <MessageSquare className="h-4 w-4" />
                      Admin Response
                    </div>

                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {ticket.adminResponse}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {isAdmin && (
                    <>
                      {ticket.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTicket(
                              ticket._id,
                              {
                                status:
                                  "in_progress",
                              },
                            )
                          }
                        >
                          Start Working
                        </Button>
                      )}

                      {ticket.status ===
                        "in_progress" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTicket(
                              ticket._id,
                              {
                                status: "resolved",
                              },
                            )
                          }
                        >
                          Mark Resolved
                        </Button>
                      )}

                      {ticket.status === "resolved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTicket(
                              ticket._id,
                              {
                                status: "closed",
                              },
                            )
                          }
                        >
                          Close Ticket
                        </Button>
                      )}
                    </>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      deleteTicket(ticket._id)
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}