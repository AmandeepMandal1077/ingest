import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { updateArchiveMeta, type ArchiveUpdateResult, checkArchiveOwnership } from "~/entities/archives";
import { ArchiveMetaSchema } from "~/entities/archives/models";

import { NxResponse } from "~/shared/lib/next/nx-response";
import { SESSION_COOKIE_NAME } from "~/shared/lib/constants";
import { verifyFirebaseSessionCookie } from "~/shared/lib/firebase/verify-session-cookie";

type ContextParams = {
  params: {
    archiveId: string;
  };
};

// Re-use existing ArchiveMetaSchema and extend it with isPublic for updates
const ArchiveUpdateSchema = ArchiveMetaSchema.partial().extend({
  isPublic: z.boolean().optional(),
}).strict(); // .strict() ensures no unknown keys are allowed

export async function PATCH(request: NextRequest, ctx: ContextParams) {
  const { archiveId } = ctx.params;

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

  // Validate archive ID parameter
  if (!archiveId || archiveId.trim() === '') {
    return NxResponse.fail(
      "Missing or invalid archive ID in request path.",
      { code: "INVALID_PARAM", details: "archiveId parameter is required." },
      400
    );
  }

  // Check archive ownership before proceeding
  const isOwner = await checkArchiveOwnership(verifiedUserId, archiveId);
  if (!isOwner) {
    return NxResponse.fail(
      "You do not have permission to update this archive.",
      { code: "FORBIDDEN", details: "User does not own this archive." },
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
  const parseResult = ArchiveUpdateSchema.safeParse(rawPayload);
  
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
    
    return NxResponse.fail(
      hasUnknownFields 
        ? "Unknown fields detected in payload. Only title, description, and isPublic are allowed." 
        : "Invalid payload format or values.",
      { 
        code: "INVALID_PAYLOAD", 
        details: JSON.stringify(errorDetails) 
      },
      400
    );
  }

  // Extract only the validated and sanitized fields
  const validatedPayload = parseResult.data;

  // Check for no-op PATCH: prevent empty payloads from reaching the service
  if (Object.keys(validatedPayload).length === 0) {
    return NxResponse.fail(
      "No valid fields provided for update. Please provide at least one field (title, description, or isPublic).",
      { code: "EMPTY_PAYLOAD", details: "No updatable fields found in request body." },
      400
    );
  }

  // Execute update with proper error handling
  let result: ArchiveUpdateResult;
  try {
    result = await updateArchiveMeta(archiveId, validatedPayload);
  } catch (_error) {
    return NxResponse.fail(
      "An unexpected error occurred while updating the archive.",
      { code: "UPDATE_FAILED", details: null },
      500
    );
  }

  if (!result.success) {
    const statusCode = result.statusCode || 500;
    const errorCode = statusCode === 429 ? "RATE_LIMIT_EXCEEDED" : 
                     statusCode === 404 ? "NOT_FOUND" : 
                     statusCode === 400? "INVALID_PAYLOAD" : "UPDATE_FAILED";
    
    // Handle 429 status code specially to include Retry-After header
    if (statusCode === 429) {
      const retryAfter = result.retryAfter || 120; // Default to 120 seconds if not provided
      const response = NextResponse.json(
        {
          success: false,
          message: result.message,
          data: null,
          error: { code: errorCode, details: null },
          meta: {
            statusCode,
            timestamp: new Date().toISOString(),
          },
        },
        { 
          status: statusCode,
          headers: {
            "Retry-After": retryAfter.toString()
          }
        }
      );
      return response;
    }
    
    return NxResponse.fail(
      result.message,
      { code: errorCode, details: null },
      statusCode
    );
  }

  // Revalidate the archive page to reflect the updated data
  revalidatePath(`/a/${archiveId}`);

  return NxResponse.success(result.message, {}, result.statusCode ?? 200);
}
