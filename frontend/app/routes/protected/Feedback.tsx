import { useEffect, useState } from "react";
import {
  MessageSquare,
  Plus,
  Star,
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

type FeedbackCategory =
  | "service"
  | "doctor"
  | "nursing"
  | "pharmacy"
  | "laboratory"
  | "technical"
  | "other";

interface Feedback {
  _id: string;
  userId: string;
  rating: number;
  category: FeedbackCategory;
  message: string;
  createdAt: string;
  updatedAt: string;
}

const categoryLabels: Record<
  FeedbackCategory,
  string
> = {
  service: "Hospital Service",
  doctor: "Doctor",
  nursing: "Nursing",
  pharmacy: "Pharmacy",
  laboratory: "Laboratory",
  technical: "Technical",
  other: "Other",
};

const renderStars = (rating: number) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-current text-yellow-500"
              : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );
};

export default function Feedback() {
  const { data: session, isPending: sessionPending } =
    authClient.useSession();

  const [feedbackList, setFeedbackList] = useState<
    Feedback[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState(5);

  const [category, setCategory] =
    useState<FeedbackCategory>("service");

  const [message, setMessage] = useState("");

  const userRole = session?.user?.role;
  const isAdmin = userRole === "admin";

  const loadFeedback = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/feedback`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load feedback",
        );
      }

      const data = await response.json();

      setFeedbackList(
        Array.isArray(data) ? data : [],
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "Failed to load feedback",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      !sessionPending &&
      session
    ) {
      loadFeedback();
    }
  }, [sessionPending, session]);

  const resetForm = () => {
    setRating(5);
    setCategory("service");
    setMessage("");
  };

  const submitFeedback = async () => {
    if (!message.trim()) {
      toast.error(
        "Please enter your feedback",
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `${API_URL}/feedback`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            rating,
            category,
            message: message.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to submit feedback",
        );
      }

      toast.success(
        "Feedback submitted successfully",
      );

      setDialogOpen(false);
      resetForm();

      await loadFeedback();
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit feedback",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteFeedback = async (
    id: string,
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this feedback?",
      );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/feedback/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to delete feedback",
        );
      }

      toast.success(
        "Feedback deleted successfully",
      );

      await loadFeedback();
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete feedback",
      );
    }
  };

  if (sessionPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">
          Loading feedback...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-7 w-7" />

            <h1 className="text-2xl font-bold">
              Feedback
            </h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Share your experience and help us improve
            the hospital system.
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Give Feedback
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>
                Submit Feedback
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>
                  Rating
                </Label>

                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setRating(value)
                        }
                        className="rounded-md p-1 transition hover:bg-muted"
                        aria-label={`${value} star rating`}
                      >
                        <Star
                          className={`h-7 w-7 ${
                            value <= rating
                              ? "fill-current text-yellow-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ),
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {rating} out of 5
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Category
                </Label>

                <Select
                  value={category}
                  onValueChange={(value) =>
                    setCategory(
                      value as FeedbackCategory,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {Object.entries(
                      categoryLabels,
                    ).map(
                      ([
                        value,
                        label,
                      ]) => (
                        <SelectItem
                          key={value}
                          value={value}
                        >
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Your Feedback
                </Label>

                <Textarea
                  placeholder="Tell us about your experience..."
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value,
                    )
                  }
                  rows={6}
                  maxLength={5000}
                />
              </div>

              <Button
                className="w-full"
                onClick={submitFeedback}
                disabled={submitting}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Feedback"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex min-h-[250px] items-center justify-center">
            <p className="text-muted-foreground">
              Loading feedback...
            </p>
          </CardContent>
        </Card>
      ) : feedbackList.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />

            <h2 className="text-lg font-semibold">
              No feedback yet
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to share your experience.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {feedbackList.map(
            (feedback) => (
              <Card
                key={feedback._id}
              >
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {
                          categoryLabels[
                            feedback.category
                          ]
                        }
                      </CardTitle>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {new Date(
                          feedback.createdAt,
                        ).toLocaleString()}
                      </p>
                    </div>

                    {renderStars(
                      feedback.rating,
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="whitespace-pre-wrap text-sm">
                      {
                        feedback.message
                      }
                    </p>
                  </div>

                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        deleteFeedback(
                          feedback._id,
                        )
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}