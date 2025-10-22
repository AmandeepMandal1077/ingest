"use client";

import { CopyIcon, ShareIcon } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import appConfig from "~/shared/app-config";

type ShareArchiveProps = {
  archiveId: string;
  archiveDescription: string;
  archiveTitle: string;
};

export default function ShareArchive({
  archiveId,
  archiveDescription,
  archiveTitle,
}: ShareArchiveProps) {
  const shareData = useMemo(
    () => ({
      text: archiveDescription,
      title: archiveTitle,
      url: `${appConfig.url}/a/${archiveId}`,
    }),
    [archiveId, archiveDescription, archiveTitle]
  );

  const copyLink = () => {
    window.navigator.clipboard.writeText(shareData.url);
    toast("Link copied", {
      description: "The archive link has been copied to your clipboard.",
    });
  };

  const shareLink = async () => {
    try {
      await window.navigator.share(shareData);
    } catch (err) {
      if (err instanceof Error) {
        return toast(err.message);
      }

      return toast("Something went wrong!");
    }
  };

  // Firefox doesn't support it yet, 23-11-2024
  if (
    typeof window.navigator.canShare === "function" &&
    window.navigator.canShare(shareData)
  ) {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-2 text-xs text-left"
        onClick={shareLink}
      >
        <ShareIcon className="size-4" />
        Share archive
      </button>
    );
  } else {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-2 text-xs text-left"
        onClick={copyLink}
      >
        <CopyIcon className="size-4" />
        Copy to Clipboard
      </button>
    );
  }
}
