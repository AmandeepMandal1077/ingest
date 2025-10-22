"use client";

import type { ZCatalogValid } from "~/entities/catalogs/models";
import { useEffect, useState } from "react";

import fetchApi from "~/shared/lib/api/fetch";

import BackLink from "~/widgets/back-link";
import DetailsCard from "~/widgets/details-card";
import GridContainer from "~/widgets/grid-container";
import {
  PublicContentContainer,
  PublicHeaderTitle,
  PublicMainContainer,
} from "~/widgets/public-layout";
import { ToggleGroup, ToggleGroupItem } from "~/shared/ui/toggle-group";

export default function Catalogs() {
  const [isPublic, setIsPublic] = useState(true);
  const [catalogs, setCatalogs] = useState<ZCatalogValid[]>([]);

  const handleToggle = (value: string) => {
    setIsPublic(value === "public");
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchCatalogs = async () => {
      try {
        const response = await fetchApi<ZCatalogValid[]>(`/catalogs/valid?isPublic=${isPublic}`, {
          signal: controller.signal,
        });
        if (response.data) {
          const sortedByPageviews = [...response.data].sort(
            (a, b) => (b.pageviews || 0) - (a.pageviews || 0)
          );
          setCatalogs(sortedByPageviews);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          // Handle other errors if needed
          console.error('Fetch error:', error);
        }
      }
    };

    fetchCatalogs();

    return () => {
      controller.abort();
    };
  }, [isPublic]);

  return (
    <PublicMainContainer>
      <PublicHeaderTitle>
        <div className="flex items-center justify-between w-full">
          <h1 className="text-lg lg:text-xl tracking-wide flex gap-2 items-center">
            <BackLink href="/explore" />
            <p>Catalogs</p>
          </h1>
          <ToggleGroup
            type="single"
            defaultValue="public"
            onValueChange={handleToggle}
            className="border rounded-md p-1"
          >
            <ToggleGroupItem
              value="public"
              style={isPublic ? { backgroundColor: 'rgb(215, 38, 77)', color: 'white' } : {}}
            >
              Public
            </ToggleGroupItem>
            <ToggleGroupItem
              value="private"
              style={!isPublic ? { backgroundColor: 'rgb(215, 38, 77)', color: 'white' } : {}}
            >
              Private
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </PublicHeaderTitle>
      <PublicContentContainer>
        <GridContainer>
          {catalogs?.length ? (
            catalogs?.map((pageData) => {
              if (pageData?.id) {
                return (
                  <DetailsCard
                    path={`/c/${pageData.id}`}
                    key={pageData.id}
                    validData={pageData}
                  />
                );
              }
            })
          ) : (
            <div>No catalogs found.</div>
          )}
        </GridContainer>
      </PublicContentContainer>
    </PublicMainContainer>
  );
}
