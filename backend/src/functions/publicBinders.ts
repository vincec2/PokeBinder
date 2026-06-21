import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { documentClient } from "../lib/dynamodb.js";
import { jsonResponse } from "../lib/response.js";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BINDERS_TABLE_NAME = process.env.BINDERS_TABLE_NAME;
const BINDER_CARDS_TABLE_NAME = process.env.BINDER_CARDS_TABLE_NAME;
const IMAGE_BUCKET_NAME = process.env.IMAGE_BUCKET_NAME;
const s3Client = new S3Client({});
const DEFAULT_BINDER_COLOR = "#5b4634";

async function mapCardItemToSlot(item: Record<string, unknown>) {
  const slotType = item.slotType;

  if (slotType === "covered") {
    return {
      slotKey: item.slotKey,
      pageNumber: item.pageNumber,
      slotNumber: item.slotNumber,
      card: null,
      image: null,
      coveredBySlotKey:
        typeof item.coveredBySlotKey === "string"
          ? item.coveredBySlotKey
          : null,
      status: item.status ?? "missing",
      quantity: item.quantity ?? 0,
      notes: item.notes ?? "",
      updatedAt: item.updatedAt ?? item.addedAt ?? new Date().toISOString(),
    };
  }

  if (slotType === "image" && typeof item.slotImageKey === "string") {
    return {
      slotKey: item.slotKey,
      pageNumber: item.pageNumber,
      slotNumber: item.slotNumber,
      card: null,
      image: {
        imageKey: item.slotImageKey,
        imageUrl: await getCoverImageUrl(item.slotImageKey),
        fileName:
          typeof item.slotImageFileName === "string"
            ? item.slotImageFileName
            : "Binder image",
        span: 1,
      },
      coveredBySlotKey: null,
      status: "owned",
      quantity: 1,
      notes: item.notes ?? "",
      updatedAt: item.updatedAt ?? item.addedAt ?? new Date().toISOString(),
    };
  }

  const cardId = item.cardId;
  const cardName = item.cardName;
  const setName = item.setName;
  const imageUrl = item.imageUrl;

  const hasCard =
    typeof cardId === "string" &&
    typeof cardName === "string" &&
    typeof setName === "string" &&
    typeof imageUrl === "string";

  return {
    slotKey: item.slotKey,
    pageNumber: item.pageNumber,
    slotNumber: item.slotNumber,
    card: hasCard
      ? {
          cardId,
          name: cardName,
          setName,
          imageUrl,
          rarity: typeof item.rarity === "string" ? item.rarity : undefined,
        }
      : null,
    image: null,
    coveredBySlotKey: null,
    status: item.status ?? "owned",
    quantity: item.quantity ?? 1,
    notes: item.notes ?? "",
    updatedAt: item.updatedAt ?? item.addedAt ?? new Date().toISOString(),
  };
}

async function getCoverImageUrl(coverImageKey?: string) {
  if (!coverImageKey) {
    return null;
  }

  if (!IMAGE_BUCKET_NAME) {
    throw new Error("IMAGE_BUCKET_NAME environment variable is not set.");
  }

  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: IMAGE_BUCKET_NAME,
      Key: coverImageKey,
    }),
    {
      expiresIn: 3600,
    }
  );
}

export async function handler(event: APIGatewayProxyEventV2) {
  if (!BINDERS_TABLE_NAME || !BINDER_CARDS_TABLE_NAME) {
    return jsonResponse(500, {
      message: "Missing table environment variables.",
    });
  }

  const shareId = event.pathParameters?.shareId;

  if (!shareId) {
    return jsonResponse(400, {
      message: "Missing shareId.",
    });
  }

  const binderResult = await documentClient.send(
    new QueryCommand({
      TableName: BINDERS_TABLE_NAME,
      IndexName: "ShareIdIndex",
      KeyConditionExpression: "shareId = :shareId",
      ExpressionAttributeValues: {
        ":shareId": shareId,
      },
      Limit: 1,
    })
  );

  const binder = binderResult.Items?.[0];

  if (!binder || binder.isPublic !== true) {
    return jsonResponse(404, {
      message: "Public binder not found.",
    });
  }

  const cardsResult = await documentClient.send(
    new QueryCommand({
      TableName: BINDER_CARDS_TABLE_NAME,
      KeyConditionExpression: "binderId = :binderId",
      ExpressionAttributeValues: {
        ":binderId": binder.binderId,
      },
    })
  );

  const slots = (
    await Promise.all(
      (cardsResult.Items ?? []).map((item) => mapCardItemToSlot(item))
    )
  ).sort(
    (a, b) =>
      Number(a.pageNumber) - Number(b.pageNumber) ||
      Number(a.slotNumber) - Number(b.slotNumber)
  );

  return jsonResponse(200, {
    binder: {
      binderId: binder.binderId,
      name: binder.name,
      description: binder.description,
      pageNumber: binder.pageNumber ?? 1,
      pageCount: binder.pageCount ?? 5,
      layout: binder.layout,
      previewPageColor: binder.previewPageColor ?? "#1b1814",
      binderColor:
        typeof binder.binderColor === "string"
          ? binder.binderColor
          : DEFAULT_BINDER_COLOR,
      isPublic: binder.isPublic,
      shareId: binder.shareId,
      coverImageKey:
        typeof binder.coverImageKey === "string" ? binder.coverImageKey : null,
      coverImageUrl:
        typeof binder.coverImageKey === "string"
          ? await getCoverImageUrl(binder.coverImageKey)
          : null,
      updatedAt: binder.updatedAt,
      slots,
    },
  });
}