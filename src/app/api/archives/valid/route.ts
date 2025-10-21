import { getValidArchiveIds } from "~/entities/archives";

import { NxResponse } from "~/shared/lib/next/nx-response";
import Log from "~/shared/utils/terminal-logger";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const isPublic = url.searchParams.get("isPublic") === "true";

    const pageListData = await getValidArchiveIds(isPublic);
    return NxResponse.success(
      "Valid archive ids fetched successfully.",
      pageListData,
      200
    );
  } catch (err) {
    Log.fail(err);
    return NxResponse.fail(
      "Unable to parse valid archive ids.",
      { code: "ARCHIVE_VALID", details: "Unable to parse valid archive ids." },
      400
    );
  }
}
