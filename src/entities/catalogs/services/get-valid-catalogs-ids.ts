import { unstable_noStore } from "next/cache";

import { refs } from "~/shared/lib/firebase/refs";

import type { ZCatalogDocument, ZCatalogValid } from "../models";

const matchesVisibility = (catalogData: ZCatalogDocument, isPublic: boolean): boolean => {
  return catalogData.isPublic === isPublic;
};

export async function getValidCatalogIds(isPublic?: boolean) {
  unstable_noStore();
  const catalogListData: ZCatalogValid[] = [];

  // Filter the catalog, where totalVideos is greater than 0, and pageviews are sorted 'desc'
  let validCatalogQuery = refs.catalogs
    .where("data.totalVideos", ">", 0)
    .orderBy("pageviews", "desc")
    .limit(50);

  // Add visibility filter to the query for better performance
  // Note: Requires composite index on (data.totalVideos, pageviews, isPublic) for optimal performance
  if (typeof isPublic === "boolean") {
    validCatalogQuery = validCatalogQuery.where("isPublic", "==", isPublic);
  }

  const querySnapshot = await validCatalogQuery.get();
  if (querySnapshot.empty) {
    return catalogListData;
  }

  // Use snapshot data directly instead of fetching each catalog again
  for (const doc of querySnapshot.docs) {
    const catalogData = doc.data() as ZCatalogDocument;

    // When isPublic is undefined, we include all catalogs
    // When isPublic is a boolean, the query already filtered, so we can skip the check
    const matchesVisibilityFilter = isPublic === undefined ? true : matchesVisibility(catalogData, isPublic);

    if (matchesVisibilityFilter) {
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

const getVideoThumbnails = (catalogData: ZCatalogDocument) => {
  const videos = catalogData.data.videos;
  const dayThumbnails = videos?.day.map((video) => video.videoThumbnail) ?? [];
  const weekThumbnails =
    videos?.week.map((video) => video.videoThumbnail) ?? [];
  const monthThumbnails =
    videos?.month.map((video) => video.videoThumbnail) ?? [];
  return [...dayThumbnails, ...weekThumbnails, ...monthThumbnails];
};
