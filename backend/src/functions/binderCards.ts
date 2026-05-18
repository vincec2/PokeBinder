import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { getUserIdFromEvent } from "../lib/auth.js";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { documentClient } from "../lib/dynamodb";
import { jsonResponse } from "../lib/response";
import type {
  BinderCardRecord,
  BinderRecord,
  BinderSlot,
} from "../types/binder";
import type { CardStatus, PokemonCard } from "../types/card";

const VALID_STATUSES: CardStatus[] = [
  "owned",
  "missing",
  "wishlist",
  "duplicate",
];

function getBindersTableName() {
  const tableName = process.env.BINDERS_TABLE_NAME;

  if (!tableName) {
    throw new Error("BINDERS_TABLE_NAME environment variable is not set.");
  }

  return tableName;
}

function getBinderCardsTableName() {
  const tableName = process.env.BINDER_CARDS_TABLE_NAME;

  if (!tableName) {
    throw new Error("BINDER_CARDS_TABLE_NAME environment variable is not set.");
  }

  return tableName;
}

function getBinderId(event: APIGatewayProxyEventV2) {
  return event.pathParameters?.binderId;
}

function getSlotKey(event: APIGatewayProxyEventV2) {
  return event.pathParameters?.slotKey;
}

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

function isValidStatus(value: unknown): value is CardStatus {
  return typeof value === "string" && VALID_STATUSES.includes(value as CardStatus);
}

function parseSlotKey(slotKey: string) {
  const match = slotKey.match(/^page#(\d+)_slot#(\d+)$/);

  if (!match) {
    return {
      pageNumber: 1,
      slotNumber: 1,
    };
  }

  return {
    pageNumber: Number(match[1]),
    slotNumber: Number(match[2]),
  };
}

function isPokemonCard(value: unknown): value is PokemonCard {
  if (!value || typeof value !== "object") {
    return false;
  }

  const card = value as Record<string, unknown>;

  return (
    typeof card.cardId === "string" &&
    typeof card.name === "string" &&
    typeof card.setName === "string" &&
    typeof card.imageUrl === "string"
  );
}

function toApiSlot(record: BinderCardRecord): BinderSlot {
  return {
    slotKey: record.slotKey,
    pageNumber: record.pageNumber,
    slotNumber: record.slotNumber,
    card: {
      cardId: record.cardId,
      name: record.cardName,
      setName: record.setName,
      imageUrl: record.imageUrl,
      rarity: record.rarity,
    },
    status: record.status,
    quantity: record.quantity,
    notes: record.notes,
    updatedAt: record.updatedAt,
  };
}

async function getOwnedBinder(userId: string, binderId: string) {
  const result = await documentClient.send(
    new GetCommand({
      TableName: getBindersTableName(),
      Key: {
        userId,
        binderId,
      },
    })
  );

  return result.Item as BinderRecord | undefined;
}

async function listBinderCards(event: APIGatewayProxyEventV2, userId: string) {
  const binderId = getBinderId(event);

  if (!binderId) {
    return jsonResponse(400, {
      message: "Missing binderId.",
    });
  }

  const binder = await getOwnedBinder(userId, binderId);

  if (!binder) {
    return jsonResponse(404, {
      message: "Binder not found.",
    });
  }

  const result = await documentClient.send(
    new QueryCommand({
      TableName: getBinderCardsTableName(),
      KeyConditionExpression: "#binderId = :binderId",
      ExpressionAttributeNames: {
        "#binderId": "binderId",
      },
      ExpressionAttributeValues: {
        ":binderId": binderId,
      },
    })
  );

  const cards = (result.Items ?? []) as BinderCardRecord[];

  const slots = cards
    .map(toApiSlot)
    .sort((a, b) => a.slotNumber - b.slotNumber);

  return jsonResponse(200, {
    slots,
  });
}

async function upsertBinderCard(event: APIGatewayProxyEventV2, userId: string) {
  const binderId = getBinderId(event);
  const slotKey = getSlotKey(event);

  if (!binderId) {
    return jsonResponse(400, {
      message: "Missing binderId.",
    });
  }

  if (!slotKey) {
    return jsonResponse(400, {
      message: "Missing slotKey.",
    });
  }

  const binder = await getOwnedBinder(userId, binderId);

  if (!binder) {
    return jsonResponse(404, {
      message: "Binder not found.",
    });
  }

  const body = parseJsonBody(event);

  if (body === null) {
    return jsonResponse(400, {
      message: "Invalid JSON body.",
    });
  }

  if (!isPokemonCard(body.card)) {
    return jsonResponse(400, {
      message:
        "Missing valid card object. Expected cardId, name, setName, and imageUrl.",
    });
  }

  const { pageNumber, slotNumber } = parseSlotKey(slotKey);
  const now = new Date().toISOString();

  const cardRecord: BinderCardRecord = {
    binderId,
    slotKey,
    userId,
    cardId: body.card.cardId,
    cardName: body.card.name,
    setName: body.card.setName,
    imageUrl: body.card.imageUrl,
    rarity: body.card.rarity,
    pageNumber,
    slotNumber,
    status: isValidStatus(body.status) ? body.status : "owned",
    quantity:
      typeof body.quantity === "number" && body.quantity > 0
        ? body.quantity
        : 1,
    condition: typeof body.condition === "string" ? body.condition : undefined,
    notes: typeof body.notes === "string" ? body.notes : "",
    addedAt: now,
    updatedAt: now,
  };

  await documentClient.send(
    new PutCommand({
      TableName: getBinderCardsTableName(),
      Item: cardRecord,
    })
  );

  return jsonResponse(200, {
    slot: toApiSlot(cardRecord),
  });
}

async function deleteBinderCard(event: APIGatewayProxyEventV2, userId: string) {
  const binderId = getBinderId(event);
  const slotKey = getSlotKey(event);

  if (!binderId) {
    return jsonResponse(400, {
      message: "Missing binderId.",
    });
  }

  if (!slotKey) {
    return jsonResponse(400, {
      message: "Missing slotKey.",
    });
  }

  const binder = await getOwnedBinder(userId, binderId);

  if (!binder) {
    return jsonResponse(404, {
      message: "Binder not found.",
    });
  }

  await documentClient.send(
    new DeleteCommand({
      TableName: getBinderCardsTableName(),
      Key: {
        binderId,
        slotKey,
      },
    })
  );

  return jsonResponse(200, {
    deletedSlotKey: slotKey,
  });
}

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const userId = getUserIdFromEvent(event);
    const method = event.requestContext.http.method;
    const slotKey = getSlotKey(event);

    if (method === "GET" && !slotKey) {
      return listBinderCards(event, userId);
    }

    if (method === "PUT" && slotKey) {
      return upsertBinderCard(event, userId);
    }

    if (method === "DELETE" && slotKey) {
      return deleteBinderCard(event, userId);
    }

    return jsonResponse(405, {
      message: `Method ${method} is not allowed for this route.`,
    });
  } catch (error) {
    console.error(error);

    return jsonResponse(500, {
      message: "Internal server error.",
    });
  }
}