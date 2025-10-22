import { unstable_noStore } from "next/cache";

import { refs } from "~/shared/lib/firebase/refs";

import type { ZCatalogDocument, ZCatalogValid } from "../models";

export async function getValidCatalogIds(isPublic?: boolean) {
  unstable_noStore();
  const catalogListData: ZCatalogValid[] = [];

  // Filter the catalog, where totalVideos is greater than 0, and pageviews are sorted 'desc'
  const validCatalogQuery = refs.catalogs
    .where("data.totalVideos", ">", 0)
    .orderBy("pageviews", "desc")
    .limit(50);

  const querySnapshot = await validCatalogQuery.get();
  if (querySnapshot.empty) {
    return catalogListData;
  }

  // Use snapshot data directly instead of fetching each catalog again
  for (const doc of querySnapshot.docs) {
    const catalogData = doc.data() as ZCatalogDocument;
    
    // Check if catalog has videos matching the filter
    const hasMatchingVideos = isPublic === undefined ? true : matchesVisibility(catalogData, isPublic);

    if (hasMatchingVideos) {
      const metaData: ZCatalogValid = {
        description: catalogData.description,
        id: doc.id,
        isPublic: catalogData.isPublic ?? true,
        pageviews: catalogData.pageviews ?? 0,
        thumbnails: getVideoThumbnails(catalogData),
        title: catalogData.title,
        totalPosts: catalogData.data.totalPosts,
        totalVideos: catalogData.data.totalVideos,
        updatedAt: catalogData.data.updatedAt,
      };

      catalogListData.push(metaData);
    }
  }

  return catalogListData;
}

const matchesVisibility = (catalogData: ZCatalogDocument, isPublic: boolean) => {
  // Treat missing isPublic as public to match returned metadata default
  const docIsPublic = catalogData.isPublic ?? true;
  return docIsPublic === isPublic;
};

const getVideoThumbnails = (catalogData: ZCatalogDocument) => {
  const videos = catalogData.data.videos;
  const dayThumbnails = videos?.day.map((video) => video.videoThumbnail) ?? [];
  const weekThumbnails =
    videos?.week.map((video) => video.videoThumbnail) ?? [];
  const monthThumbnails =
    videos?.month.map((video) => video.videoThumbnail) ?? [];
  return [...dayThumbnails, ...weekThumbnails, ...monthThumbnails];
};
