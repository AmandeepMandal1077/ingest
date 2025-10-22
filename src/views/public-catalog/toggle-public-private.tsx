"use client";

import { Lock, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { cn } from "~/shared/utils/tailwind-merge";

interface TogglePublicPrivateProps {
  catalogId: string;
  initialIsPublic: boolean;
}

export function TogglePublicPrivate({
  catalogId,
  initialIsPublic,
}: TogglePublicPrivateProps) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);

  // Sync state when initialIsPublic prop changes (e.g., after page reload)
  useEffect(() => {
    setIsPublic(initialIsPublic);
  }, [initialIsPublic]);

  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitRemaining !== null && rateLimitRemaining > 0) {
      const timer = setTimeout(() => {
        setRateLimitRemaining(rateLimitRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (rateLimitRemaining === 0) {
      setRateLimitRemaining(null);
    }
  }, [rateLimitRemaining]);

  const handleToggle = async () => {
    if (saving) return;
    const newIsPublic = !isPublic;
    setSaving(true);

    try {
      const response = await fetch(`/api/catalogs/${catalogId}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic: newIsPublic }),
      });

      if (response.ok) {
        // Handle successful response
        let data: { success?: boolean; message?: string };
        try {
          data = await response.json();
        } catch {
          // If JSON parsing fails on success, assume success
          data = { success: true };
        }

        if (data.success) {
          startTransition(() => {
            setIsPublic(newIsPublic);
            setRateLimitRemaining(null);
            toast.success(
              `Catalog is now ${newIsPublic ? "public" : "private"}`
            );
            // Refresh the page to update the data from server
            router.refresh();
          });
        } else {
          toast.error(data.message || "Failed to update catalog visibility");
        }
      } else {
        // Handle non-OK response
        let retryAfterSeconds: number | null = null;
        let errorMessage = "Failed to update catalog visibility";

        // Try to parse Retry-After header
        const retryAfterHeader = response.headers.get("Retry-After");
        if (retryAfterHeader) {
          // Check if it's a number (delay-seconds)
          const numericRetryAfter = Number(retryAfterHeader);
          if (!Number.isNaN(numericRetryAfter) && numericRetryAfter > 0) {
            retryAfterSeconds = Math.ceil(numericRetryAfter);
          } else {
        // Try to parse as HTTP-date
        try {
          const retryAfterDate = Date.parse(retryAfterHeader);
          if (!Number.isNaN(retryAfterDate)) {
            const secondsRemaining = (retryAfterDate - Date.now()) / 1000;
            if (secondsRemaining > 0) {
              retryAfterSeconds = Math.ceil(secondsRemaining);
            }
          }
        } catch {
          // Ignore parsing errors
        }
          }
        }

        // Try to read JSON safely
        let data: { error?: { code?: string }; message?: string } | null = null;
        try {
          data = await response.json();
        } catch {
          // JSON parsing failed, data remains null
        }

        // Determine retry time and error message
        if (data?.error?.code === "RATE_LIMIT_EXCEEDED" || response.status === 429) {
          // Use Retry-After header if available
          if (retryAfterSeconds !== null) {
            setRateLimitRemaining(retryAfterSeconds);
            errorMessage = `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`;
          } else if (data?.message) {
            // Fall back to extracting from message
            const match = data.message.match(/(\d+)\s+seconds/);
            if (match) {
              const seconds = Number.parseInt(match[1], 10);
              setRateLimitRemaining(seconds);
              errorMessage = `Rate limit exceeded. Try again in ${seconds} seconds.`;
            } else {
              errorMessage = data.message;
            }
          } else {
            errorMessage = "Rate limit exceeded. Please try again later.";
          }
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (response.status === 404) {
          errorMessage = "Catalog not found";
        } else if (response.status === 403) {
          errorMessage = "You don't have permission to update this catalog";
        } else if (response.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        }

        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error toggling catalog visibility:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = saving || isPending || rateLimitRemaining !== null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isDisabled}
      className={cn(
        "flex w-full items-center gap-2 text-left",
        isDisabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {isPublic ? (
        <>
          <Lock className="size-4" />
          <span>Make Private</span>
        </>
      ) : (
        <>
          <Unlock className="size-4" />
          <span>Make Public</span>
        </>
      )}
      {rateLimitRemaining !== null && (
        <span className="ml-auto text-xs text-muted-foreground">
          ({rateLimitRemaining}s)
        </span>
      )}
    </button>
  );
}
