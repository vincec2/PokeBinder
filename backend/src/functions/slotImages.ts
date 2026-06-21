import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { BatchWriteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { documentClient } from "../lib/dynamodb";
import { getUserIdFromEvent } from "../lib/auth.js";
import { jsonResponse } from "../lib/response";
import { getImageUrl } from "../lib/s3Images";
import type {
  BinderLayout,
  BinderRecord,
  BinderSlot,
  BinderCardRecord,
} from "../types/binder";

const SLOT_COUNTS: Record<BinderLayout, number> = {
  "2x2": 4,
  "3x3": 9,
};

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

function getBinderId(event: APIGatewayProxyEventV2) {
  return event.pathParameters?.binderId;
}

function getSlotKey(event: APIGatewayProxyEventV2) {
  return event.pathParameters?.slotKey;
}

function formatPageNumber(pageNumber: number) {
  return String(pageNumber).padStart(3, "0");
}

function formatSlotNumber(slotNumber: number) {
  return String(slotNumber).padStart(2, "0");
}

function createSlotKey(pageNumber: number, slotNumber: number) {
  return `page#${formatPageNumber(pageNumber)}_slot#${formatSlotNumber(
    slotNumber
  )}`;
}

async function getBinderRecord(userId: string, binderId: string) {
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

async function getSlotRecord(binderId: string, slotKey: string) {
  const result = await documentClient.send(
    new GetCommand({
      TableName: getBinderCardsTableName(),
      Key: {
        binderId,
        slotKey,
      },
    })
  );

  return result.Item as BinderCardRecord | undefined;
}


function toApiImageSlot(record: BinderCardRecord, imageUrl: string | null): BinderSlot {
  return {
    slotKey: record.slotKey,
    pageNumber: record.pageNumber,
    slotNumber: record.slotNumber,
    card: null,
    image: record.slotImageKey
      ? {
          imageKey: record.slotImageKey,
          imageUrl,
          fileName: record.slotImageFileName ?? "Binder image",
          span: 1,
        }
      : null,
    coveredBySlotKey: null,
    status: "owned",
    quantity: 1,
    notes: record.notes,
    updatedAt: record.updatedAt,
  };
}

async function putSlotImage(event: APIGatewayProxyEventV2) {
  const userId = getUserIdFromEvent(event);
  const binderId = getBinderId(event);
  const slotKey = getSlotKey(event);
  const body = parseJsonBody(event);

  if (!binderId || !slotKey) {
    return jsonResponse(400, {
      message: "Missing binderId or slotKey.",
    });
  }

  if (body === null) {
    return jsonResponse(400, {
      message: "Invalid JSON body.",
    });
  }

  const binder = await getBinderRecord(userId, binderId);

  if (!binder) {
    return jsonResponse(404, {
      message: "Binder not found.",
    });
  }

  const imageKey = typeof body.imageKey === "string" ? body.imageKey : "";
  const fileName =
    typeof body.fileName === "string" && body.fileName.trim()
      ? body.fileName.trim()
      : "Binder image";
  const pageNumber =
    typeof body.pageNumber === "number" ? body.pageNumber : Number.NaN;
  const slotNumber =
    typeof body.slotNumber === "number" ? body.slotNumber : Number.NaN;
  if (!imageKey) {
    return jsonResponse(400, {
      message: "Missing imageKey.",
    });
  }

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return jsonResponse(400, {
      message: "Invalid pageNumber.",
    });
  }

  if (!Number.isInteger(slotNumber) || slotNumber < 1) {
    return jsonResponse(400, {
      message: "Invalid slotNumber.",
    });
  }

  const maxSlotNumber = SLOT_COUNTS[binder.layout];

  if (slotNumber > maxSlotNumber) {
    return jsonResponse(400, {
      message: "Invalid slot for this binder layout.",
    });
  }

  const existingAnchorSlot = await getSlotRecord(binderId, slotKey);

  if (
    existingAnchorSlot &&
    existingAnchorSlot.slotType !== "image" &&
    existingAnchorSlot.slotType !== undefined
  ) {
    return jsonResponse(409, {
      message: "This slot is already occupied.",
    });
  }

  const now = new Date().toISOString();

  const anchorRecord: BinderCardRecord = {
    binderId,
    slotKey,
    userId,
    slotType: "image",
    slotImageKey: imageKey,
    slotImageFileName: fileName,
    slotImageSpan: 1,
    pageNumber,
    slotNumber,
    status: "owned",
    quantity: 1,
    notes: "",
    addedAt: existingAnchorSlot?.addedAt ?? now,
    updatedAt: now,
  };

  await documentClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [getBinderCardsTableName()]: [
          {
            PutRequest: {
              Item: anchorRecord,
            },
          },
        ],
      },
    })
  );

  const imageUrl = await getImageUrl(imageKey);

  return jsonResponse(200, {
    slot: toApiImageSlot(anchorRecord, imageUrl),
  });
}

async function deleteSlotImage(event: APIGatewayProxyEventV2) {
  const userId = getUserIdFromEvent(event);
  const binderId = getBinderId(event);
  const slotKey = getSlotKey(event);

  if (!binderId || !slotKey) {
    return jsonResponse(400, {
      message: "Missing binderId or slotKey.",
    });
  }

  const binder = await getBinderRecord(userId, binderId);

  if (!binder) {
    return jsonResponse(404, {
      message: "Binder not found.",
    });
  }

  const selectedSlotRecord = await getSlotRecord(binderId, slotKey);

  if (!selectedSlotRecord) {
    return jsonResponse(404, {
      message: "Image slot not found.",
    });
  }

  const anchorSlotKey =
    selectedSlotRecord.slotType === "covered"
      ? selectedSlotRecord.coveredBySlotKey
      : selectedSlotRecord.slotKey;

  if (!anchorSlotKey) {
    return jsonResponse(400, {
      message: "Invalid covered image slot.",
    });
  }

  const anchorSlotRecord =
    anchorSlotKey === selectedSlotRecord.slotKey
      ? selectedSlotRecord
      : await getSlotRecord(binderId, anchorSlotKey);

  if (!anchorSlotRecord || anchorSlotRecord.slotType !== "image") {
    return jsonResponse(409, {
      message: "Selected slot is not an image slot.",
    });
  }

  const deletedSlotKeys = [anchorSlotRecord.slotKey];

  // Legacy cleanup: old 2-slot images created a covered second slot.
  // New uploads are always 1-slot images, but this keeps old test data removable.
  if (anchorSlotRecord.slotImageSpan === 2) {
    deletedSlotKeys.push(
      createSlotKey(anchorSlotRecord.pageNumber, anchorSlotRecord.slotNumber + 1)
    );
  }

  await documentClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [getBinderCardsTableName()]: deletedSlotKeys.map((key) => ({
          DeleteRequest: {
            Key: {
              binderId,
              slotKey: key,
            },
          },
        })),
      },
    })
  );

  return jsonResponse(200, {
    deletedSlotKeys,
  });
}

export async function handler(event: APIGatewayProxyEventV2) {
  const method = event.requestContext.http.method;

  if (method === "PUT") {
    return putSlotImage(event);
  }

  if (method === "DELETE") {
    return deleteSlotImage(event);
  }

  return jsonResponse(405, {
    message: "Method not allowed.",
  });
}