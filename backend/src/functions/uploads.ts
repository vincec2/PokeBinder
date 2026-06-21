import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getUserIdFromEvent } from "../lib/auth.js";
import { documentClient } from "../lib/dynamodb";
import { jsonResponse } from "../lib/response";

const BINDERS_TABLE_NAME = process.env.BINDERS_TABLE_NAME;
const IMAGE_BUCKET_NAME = process.env.IMAGE_BUCKET_NAME;

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function parseJsonBody(event: APIGatewayProxyEventV2) {
  if (!event.body) {
    return {};
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;

    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getFileExtension(contentType: string) {
  if (contentType === "image/jpeg") {
    return "jpg";
  }

  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "image/webp") {
    return "webp";
  }

  return "";
}

async function verifyBinderOwnership(userId: string, binderId: string) {
  if (!BINDERS_TABLE_NAME) {
    throw new Error("BINDERS_TABLE_NAME environment variable is not set.");
  }

  const result = await documentClient.send(
    new GetCommand({
      TableName: BINDERS_TABLE_NAME,
      Key: {
        userId,
        binderId,
      },
    })
  );

  return !!result.Item;
}

export async function handler(event: APIGatewayProxyEventV2) {
  if (!IMAGE_BUCKET_NAME) {
    return jsonResponse(500, {
      message: "IMAGE_BUCKET_NAME environment variable is not set.",
    });
  }

  if (event.requestContext.http.method !== "POST") {
    return jsonResponse(405, {
      message: "Method not allowed.",
    });
  }

  const userId = getUserIdFromEvent(event);
  const body = parseJsonBody(event);

  if (body === null) {
    return jsonResponse(400, {
      message: "Invalid JSON body.",
    });
  }

  const binderId = typeof body.binderId === "string" ? body.binderId : "";
  const contentType =
    typeof body.contentType === "string" ? body.contentType : "";
  const sizeBytes =
    typeof body.sizeBytes === "number" ? body.sizeBytes : Number.NaN;

  if (!binderId) {
    return jsonResponse(400, {
      message: "Missing binderId.",
    });
  }

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return jsonResponse(400, {
      message: "Only JPG, PNG, and WEBP images are allowed.",
    });
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return jsonResponse(400, {
      message: "Invalid file size.",
    });
  }

  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return jsonResponse(400, {
      message: "Image must be 1 MB or smaller.",
    });
  }

  const ownsBinder = await verifyBinderOwnership(userId, binderId);

  if (!ownsBinder) {
    return jsonResponse(404, {
      message: "Binder not found.",
    });
  }

  const extension = getFileExtension(contentType);
  const isSlotImageUpload = event.rawPath.includes("/slot-image-url");

  const imageKey = isSlotImageUpload
    ? `slot-images/${userId}/${binderId}/${randomUUID()}.${extension}`
    : `covers/${userId}/${binderId}/${randomUUID()}.${extension}`;

  const s3Client = new S3Client({});

  const command = new PutObjectCommand({
    Bucket: IMAGE_BUCKET_NAME,
    Key: imageKey,
    ContentType: contentType,
    Metadata: {
      userId,
      binderId,
      uploadType: "binder-cover",
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300,
  });

  return jsonResponse(200, {
    uploadUrl,
    imageKey,
  });
}