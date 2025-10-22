import { TogglePublicPrivate as SharedTogglePublicPrivate } from "~/shared/ui/toggle-public-private";

interface TogglePublicPrivateProps {
  catalogId: string;
  initialIsPublic: boolean;
}

export function TogglePublicPrivate({
  catalogId,
  initialIsPublic,
}: TogglePublicPrivateProps) {
  return (
    <SharedTogglePublicPrivate
      entityType="catalog"
      entityId={catalogId}
      initialIsPublic={initialIsPublic}
    />
  );
}
