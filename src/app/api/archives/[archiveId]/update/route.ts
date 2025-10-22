import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { updateArchiveMeta, type ArchiveUpdateResult, checkArchiveOwnership } from "~/entities/archives";
import { ArchiveMetaSchema } from "~/entities/archives/models";

import { NxResponse } from "~/shared/lib/next/nx-response";

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

  // Extract and validate userId from headers
  const userId = request.headers.get("userId");
  if (!userId) {
    return NxResponse.fail(
      "Authentication required. User ID not found.",
      { code: "UNAUTHORIZED", details: "Missing userId header." },
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
  const isOwner = await checkArchiveOwnership(userId, archiveId);
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
