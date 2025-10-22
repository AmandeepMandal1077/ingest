"use client";

import { Lock, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
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

  // Sync local state with prop changes
  useEffect(() => {
    setIsPublic(initialIsPublic);
  }, [initialIsPublic]);

  const handleToggle = async () => {
    const newIsPublic = !isPublic;

    // Set saving state to disable button and prevent duplicate clicks
    setSaving(true);

    try {
      const response = await fetch(`/api/archives/${archiveId}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic: newIsPublic }),
      });

      let parsedData: Record<string, any> = {};
      try {
        parsedData = await response.json();
      } catch {
        // Fallback to empty object if parsing fails
      }

      if (response.ok) {
        setIsPublic(newIsPublic);
        setRateLimitRemaining(null);
        toast.success(
          `Archive is now ${newIsPublic ? "public" : "private"}`
        );

        // Trigger UI transition synchronously after network request completes
        startTransition(() => {
          router.refresh();
        });
      } else {
        if (response.status === 429) {
          // Handle rate limit
          let retryAfter = response.headers.get("Retry-After");
          if (retryAfter) {
            const seconds = parseInt(retryAfter, 10);
            setRateLimitRemaining(seconds);
            toast.error(`Rate limit exceeded. Try again in ${seconds} seconds.`);
          } else {
            // Fallback to parsing seconds from body
            const message = parsedData.message || "";
            const match = message.match(/(\d+)\s+seconds/);
            if (match) {
              const seconds = parseInt(match[1], 10);
              setRateLimitRemaining(seconds);
              toast.error(`Rate limit exceeded. Try again in ${seconds} seconds.`);
            } else {
              setRateLimitRemaining(60); // Default to 60 seconds if no info
              toast.error("Rate limit exceeded. Please try again later.");
            }
          }
        } else {
          toast.error(parsedData.message || "Failed to update archive visibility");
        }
      }
    } catch (error) {
      console.error("Error toggling archive visibility:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      // Re-enable button after request completes
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
