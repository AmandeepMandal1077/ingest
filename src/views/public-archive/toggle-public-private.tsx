import { TogglePublicPrivate as SharedTogglePublicPrivate } from "~/shared/ui/toggle-public-private";

interface TogglePublicPrivateProps {
  archiveId: string;
  initialIsPublic: boolean;
}

export function TogglePublicPrivate({
  archiveId,
  initialIsPublic,
}: TogglePublicPrivateProps) {
  return (
    <SharedTogglePublicPrivate
      entityType="archive"
      entityId={archiveId}
      initialIsPublic={initialIsPublic}
    />
  );
}
