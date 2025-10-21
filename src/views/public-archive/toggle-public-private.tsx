"use client";

import { Lock, Unlock } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { cn } from "~/shared/utils/tailwind-merge";

interface TogglePublicPrivateProps {
  archiveId: string;
  initialIsPublic: boolean;
}

export function TogglePublicPrivate({
  archiveId,
  initialIsPublic,
}: TogglePublicPrivateProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isPending, startTransition] = useTransition();
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);

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
    const newIsPublic = !isPublic;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/archives/${archiveId}/update`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isPublic: newIsPublic }),
        });

        const data = await response.json();

        if (data.success) {
          setIsPublic(newIsPublic);
          setRateLimitRemaining(null);
          toast.success(
            `Archive is now ${newIsPublic ? "public" : "private"}`
          );
          // Refresh the page to update the data
          window.location.reload();
        } else {
          // Check if it's a rate limit error
          if (data.error?.code === "RATE_LIMIT_EXCEEDED") {
            // Extract remaining time from message if available
            const message = data.message || "";
            const match = message.match(/(\d+)\s+seconds/);
            if (match) {
              const seconds = Number.parseInt(match[1], 10);
              setRateLimitRemaining(seconds);
              toast.error(`Rate limit exceeded. Try again in ${seconds} seconds.`);
            } else {
              toast.error(message || "Rate limit exceeded. Please try again later.");
            }
          } else {
            toast.error(data.message || "Failed to update archive visibility");
          }
        }
      } catch (error) {
        console.error("Error toggling archive visibility:", error);
        toast.error("An unexpected error occurred. Please try again.");
      }
    });
  };

  const isDisabled = isPending || rateLimitRemaining !== null;

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
