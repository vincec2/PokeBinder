import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { documentClient } from "../lib/dynamodb.js";
import { jsonResponse } from "../lib/response.js";

const BINDERS_TABLE_NAME = process.env.BINDERS_TABLE_NAME;
const BINDER_CARDS_TABLE_NAME = process.env.BINDER_CARDS_TABLE_NAME;

function mapCardItemToSlot(item: Record<string, unknown>) {
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
          rarity:
            typeof item.rarity === "string" ? item.rarity : undefined,
        }
      : null,
    status: item.status ?? "owned",
    quantity: item.quantity ?? 1,
    notes: item.notes ?? "",
    updatedAt: item.updatedAt ?? item.addedAt ?? new Date().toISOString(),
  };
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

  const slots = (cardsResult.Items ?? [])
    .map((item) => mapCardItemToSlot(item))
    .sort(
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
      isPublic: binder.isPublic,
      shareId: binder.shareId,
      updatedAt: binder.updatedAt,
      slots,
    },
  });
}