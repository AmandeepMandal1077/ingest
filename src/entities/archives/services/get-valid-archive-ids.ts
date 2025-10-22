import { unstable_noStore } from "next/cache";

import type { ZYouTubeVideoMetadata } from "~/entities/youtube/models";

import { refs } from "~/shared/lib/firebase/refs";

import type { ZArchiveDocumentSchema, ZArchiveValid } from "../models";

const matchesVisibility = (archiveData: ZArchiveDocumentSchema, isPublic: boolean) => {
  // Treat missing isPublic as public to match returned metadata default
  const docIsPublic = archiveData.isPublic ?? true;
  return docIsPublic === isPublic;
};

export async function getValidArchiveIds(isPublic?: boolean) {
  unstable_noStore();
  const archiveListData: ZArchiveValid[] = [];

  const validArchiveQuery = refs.archives
    .where("data.videos", "!=", false)
    .limit(25);
  const validArchiveQuerySnapshot = await validArchiveQuery.get();

  if (validArchiveQuerySnapshot.empty) {
    return archiveListData;
  }

  // Use snapshot data directly instead of fetching each archive again
  for (const doc of validArchiveQuerySnapshot.docs) {
    const archiveData = doc.data() as ZArchiveDocumentSchema;
    
    // Check if archive matches visibility filter
    const hasMatchingVisibility = isPublic === undefined ? true : matchesVisibility(archiveData, isPublic);

    if (hasMatchingVisibility) {
      const thumbnails =
        Array.isArray(archiveData?.data?.videos)
          ? (archiveData.data.videos as ZYouTubeVideoMetadata[])
              .map((v) => v.videoThumbnail)
              .filter(Boolean)
          : [];
      const metaData: ZArchiveValid = {
        description: archiveData.description,
        id: doc.id,
        isPublic: archiveData.isPublic ?? true,
        thumbnails,
        title: archiveData.title,
        totalVideos: archiveData.data.totalVideos,
        updatedAt: archiveData.data.updatedAt,
      };

      archiveListData.push(metaData);
    }
  }

  return archiveListData;
}
