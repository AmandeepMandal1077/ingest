import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { updateCatalogMeta, type CatalogUpdateResult, checkCatalogOwnership } from "~/entities/catalogs";
import { CatalogMetaSchema } from "~/entities/catalogs/models";
import { NxResponse } from "~/shared/lib/next/nx-response";
import { SESSION_COOKIE_NAME } from "~/shared/lib/constants";
import { verifyFirebaseSessionCookie } from "~/shared/lib/firebase/verify-session-cookie";

type ContextParams = {
  params: {
    catalogId: string;
  };
};

// Re-use existing CatalogMetaSchema and extend it with isPublic for updates
const CatalogUpdateSchema = CatalogMetaSchema.partial().extend({
  isPublic: z.boolean().optional(),
}).strict(); // .strict() ensures no unknown keys are allowed

export async function PATCH(request: NextRequest, ctx: ContextParams) {
  const { catalogId } = ctx.params;

  // Verify authentication using server-side session cookie
  const authSessionToken = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!authSessionToken) {
    return NxResponse.fail(
      "Authentication required. No session found.",
      { code: "UNAUTHORIZED", details: "No authentication session found." },
      401
    );
  }

  let verifiedUserId: string;
  try {
    const decodedUserDetails = await verifyFirebaseSessionCookie(authSessionToken);
    if (!decodedUserDetails.sub) {
      return NxResponse.fail(
        "Unable to verify credentials.",
        { code: "VERIFICATION_FAILED", details: "Invalid user ID in session." },
        401
      );
    }
    verifiedUserId = decodedUserDetails.sub;
  } catch (err) {
    return NxResponse.fail(
      "Unable to verify credentials.",
      { code: "VERIFICATION_FAILED", details: "Unable to verify authentication session." },
      401
    );
  }

  // Validate catalog ID parameter
  if (!catalogId || catalogId.trim() === '') {
    return NxResponse.fail(
      "Missing or invalid catalog ID in request path.",
      { code: "INVALID_PARAM", details: "catalogId parameter is required." },
      400
    );
  }

  // Check catalog ownership before proceeding
  const isOwner = await checkCatalogOwnership(verifiedUserId, catalogId);
  if (!isOwner) {
    return NxResponse.fail(
      "You do not have permission to update this catalog.",
      { code: "FORBIDDEN", details: "User does not own this catalog." },
      403
    );
  }

  // Parse JSON payload with error handling
  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch (_error) {
    return NxResponse.fail(
      "Failed to parse request body.",
      { code: "INVALID_JSON", details: null },
      400
    );
  }

  // Validate and sanitize payload against our strict schema
  const parseResult = CatalogUpdateSchema.safeParse(rawPayload);
  
  if (!parseResult.success) {
    // Format validation errors for better error reporting
    const errorDetails = parseResult.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message
    }));

    // Check if there are unknown fields (strict validation failed)
    const hasUnknownFields = parseResult.error.issues.some(
      issue => issue.code === 'unrecognized_keys'
    );

    // Always return immediately on validation failure to prevent execution falling through
    const errorMessage = hasUnknownFields
      ? "Unknown fields detected in payload. Only title, description, and isPublic are allowed."
      : "Invalid payload format or values.";

    return NxResponse.fail(
      errorMessage,
      {
        code: "INVALID_PAYLOAD",
        details: errorDetails
      },
      400
    );
  }

  // Extract only the validated and sanitized fields
  const validatedPayload = parseResult.data;

  // Execute update with proper error handling
  let result: CatalogUpdateResult;
  try {
    result = await updateCatalogMeta(catalogId, validatedPayload);
  } catch (error) {
    console.error("Unexpected error updating catalog:", error);
    return NxResponse.fail(
      "An unexpected error occurred while updating the catalog.",
      { code: "UPDATE_FAILED", details: null },
      500
    );
  }

  if (!result.success) {
    const statusCode = result.statusCode || 500;
    const errorCode =
      statusCode === 429 ? "RATE_LIMIT_EXCEEDED" :
      statusCode === 404 ? "NOT_FOUND" :
      statusCode === 400 ? "INVALID_PAYLOAD" : "UPDATE_FAILED";
    
    return NxResponse.fail(
      result.message,
      { code: errorCode, details: null },
      statusCode
    );
  }

  // Revalidate the catalog page to reflect the updated data
  revalidatePath(`/c/${catalogId}`);

  return NxResponse.success(result.message, {}, result.statusCode ?? 200);
}
