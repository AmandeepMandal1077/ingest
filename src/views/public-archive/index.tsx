import dynamic from "next/dynamic";

import type { ZArchiveByID } from "~/entities/archives/models";

import fetchApi from "~/shared/lib/api/fetch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/shared/ui/dropdown-menu";
import { ThreeDotIcon } from "~/shared/ui/icons";

import BackLink from "~/widgets/back-link";
import GridContainer from "~/widgets/grid-container";
import YouTubeCard from "~/widgets/youtube/youtube-card";

import ArchiveInformationPopover from "./archive-information-popover";
import { TogglePublicPrivate } from "./toggle-public-private";

// Refer: https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading#with-no-ssr
const DynamicShareArchive = dynamic(() => import("./share-archive"), {
  ssr: false,
});

export default async function PublicArchive({
  archiveId,
}: {
  archiveId: string;
}) {
  const result = await fetchApi<ZArchiveByID>(`/archives/${archiveId}`, {
    cache: "no-store",
  });
  const archiveData = result.data;

  if (!archiveData) {
    return <p>Something went wrong while fetching archive data.</p>;
  }

  const archiveTitle = archiveData.title;
  const archiveDescription = archiveData.description;
  const archiveUpdatedAt = archiveData.updatedAt;

  return (
    <div className="space-y-4 pb-6 pt-7">
      <section className="px-2 md:px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <BackLink href="/explore/archives" />
            <div className="flex gap-1 items-center">
              <h1 className="text-lg lg:text-xl tracking-wide">{archiveTitle}</h1>
              <ArchiveInformationPopover
                description={archiveDescription}
                totalVideos={archiveData?.videos.length ?? 0}
                updatedAt={archiveUpdatedAt}
              />
            </div>
          </div>

          <div className="mr-2">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <ThreeDotIcon className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="end"
                className="border-none flex flex-col gap-2 w-44 rounded-lg"
              >
                <DropdownMenuItem className="p-2 rounded-lg">
                  <DynamicShareArchive
                    archiveId={archiveId}
                    archiveTitle={archiveTitle}
                    archiveDescription={archiveDescription}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem className="p-2 rounded-lg">
                  <TogglePublicPrivate
                    archiveId={archiveId}
                    initialIsPublic={archiveData?.isPublic ?? true}
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </section>

      {archiveData?.videos.length ? (
        <section className="px-0 md:px-3">
          <GridContainer>
            {archiveData.videos.map((video) => {
              return (
                <YouTubeCard
                  key={video.videoId}
                  video={video}
                  options={{ hideAvatar: true }}
                />
              );
            })}
          </GridContainer>
        </section>
      ) : (
        <p>No videos added yet.</p>
      )}
    </div>
  );
}
