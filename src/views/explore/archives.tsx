"use client";

import { useEffect, useState } from "react";

import type { ZArchiveValid } from "~/entities/archives/models";

import fetchApi from "~/shared/lib/api/fetch";
import { ToggleGroup, ToggleGroupItem } from "~/shared/ui/toggle-group";

import BackLink from "~/widgets/back-link";
import DetailsCard from "~/widgets/details-card";
import GridContainer from "~/widgets/grid-container";
import {
  PublicContentContainer,
  PublicHeaderTitle,
  PublicMainContainer,
} from "~/widgets/public-layout";

export default function Archives() {
  const [isPublic, setIsPublic] = useState(true);
  const [archives, setArchives] = useState<ZArchiveValid[]>([]);

  const handleToggle = (value: string | null) => {
    if (!value) return;
    setIsPublic(value === "public");
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchArchives = async () => {
      try {
        const response = await fetchApi<ZArchiveValid[]>(
          `/archives/valid?isPublic=${isPublic}`,
          {
            signal: controller.signal,
          }
        );
        if (response.data) {
          setArchives(response.data);
        } else {
          setArchives([]);
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError" || error instanceof DOMException)) {
          console.error("Fetch error:", error);
        }
      }
    };

    fetchArchives();

    return () => {
      controller.abort();
    };
  }, [isPublic]);

  return (
    <PublicMainContainer>
      <PublicHeaderTitle>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <BackLink href="/explore" />
            <h1 className="text-lg lg:text-xl tracking-wide">Archives</h1>
          </div>
          <ToggleGroup
            type="single"
            defaultValue="public"
            onValueChange={handleToggle}
            className="border rounded-md p-1"
          >
            <ToggleGroupItem
              value="public"
              style={
                isPublic
                  ? { backgroundColor: "rgb(215, 38, 77)", color: "white" }
                  : {}
              }
            >
              Public
            </ToggleGroupItem>
            <ToggleGroupItem
              value="private"
              style={
                !isPublic
                  ? { backgroundColor: "rgb(215, 38, 77)", color: "white" }
                  : {}
              }
            >
              Private
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </PublicHeaderTitle>
      <PublicContentContainer>
        <GridContainer>
          {archives?.length ? (
            archives?.map((pageData) => {
              if (pageData?.id) {
                return (
                  <DetailsCard
                    path={`/a/${pageData.id}`}
                    key={pageData.id}
                    validData={pageData}
                  />
                );
              }
            })
          ) : (
            <div>No archives found.</div>
          )}
        </GridContainer>
      </PublicContentContainer>
    </PublicMainContainer>
  );
}
