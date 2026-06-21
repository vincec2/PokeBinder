import { getUserIdFromEvent } from "../lib/auth.js";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { randomUUID } from "node:crypto";
import {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { documentClient } from "../lib/dynamodb";
import { jsonResponse } from "../lib/response";
import type {
  Binder,
  BinderCardRecord,
  BinderLayout,
  BinderRecord,
  BinderSlot,
} from "../types/binder";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getImageUrl } from "../lib/s3Images";

const DEFAULT_PAGE_COUNT = 5;
const DEFAULT_PREVIEW_PAGE_COLOR = "#1b1814";
const DEFAULT_BINDER_COLOR = "#5b4634";

const IMAGE_BUCKET_NAME = process.env.IMAGE_BUCKET_NAME;
const s3Client = new S3Client({});

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

async function toApiSlot(record: BinderCardRecord): Promise<BinderSlot> {
  if (record.slotType === "covered") {
    return {
      slotKey: record.slotKey,
      pageNumber: record.pageNumber,
      slotNumber: record.slotNumber,
      card: null,
      image: null,
      coveredBySlotKey: record.coveredBySlotKey ?? null,
      status: "missing",
      quantity: 0,
      notes: "",
      updatedAt: record.updatedAt,
    };
  }

  if (record.slotType === "image" && record.slotImageKey) {
    return {
      slotKey: record.slotKey,
      pageNumber: record.pageNumber,
      slotNumber: record.slotNumber,
      card: null,
      image: {
        imageKey: record.slotImageKey,
        imageUrl: await getImageUrl(record.slotImageKey),
        fileName: record.slotImageFileName ?? "Binder image",
        span: record.slotImageSpan ?? 1,
      },
      coveredBySlotKey: null,
      status: "owned",
      quantity: 1,
      notes: record.notes,
      updatedAt: record.updatedAt,
    };
  }

  return {
    slotKey: record.slotKey,
    pageNumber: record.pageNumber,
    slotNumber: record.slotNumber,
    card:
      record.cardId && record.cardName && record.setName && record.imageUrl
        ? {
            cardId: record.cardId,
            name: record.cardName,
            setName: record.setName,
            imageUrl: record.imageUrl,
            rarity: record.rarity,
          }
        : null,
    image: null,
    coveredBySlotKey: null,
    status: record.status,
    quantity: record.quantity,
    notes: record.notes,
    updatedAt: record.updatedAt,
  };
}

async function toApiBinder(
  record: BinderRecord,
  slots: BinderSlot[] = []
): Promise<Binder> {
  return {
    binderId: record.binderId,
    name: record.name,
    description: record.description,
    pageNumber: record.pageNumber,
    pageCount: record.pageCount,
    layout: record.layout,
    slots,
    isPublic: record.isPublic,
    shareId: record.shareId ?? null,
    coverImageKey: record.coverImageKey ?? null,
    coverImageUrl: await getCoverImageUrl(record.coverImageKey),
    previewPageColor: record.previewPageColor,
    binderColor: record.binderColor ?? DEFAULT_BINDER_COLOR,
    updatedAt: record.updatedAt,
  };
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

function getValidatedLayout(value: unknown): BinderLayout {
  return value === "2x2" ? "2x2" : "3x3";
}

function getBinderId(event: APIGatewayProxyEventV2) {
  return event.pathParameters?.binderId;
}

async function getBinderRecord(userId: string, binderId: string) {
  const result = await documentClient.send(
    new GetCommand({
      TableName: getBindersTableName(),
      Key: {
        userId: userId,
        binderId,
      },
    })
  );

  return result.Item as BinderRecord | undefined;
}

async function getBinderSlots(binderId: string) {
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

  const records = (result.Items ?? []) as BinderCardRecord[];

  const slots = await Promise.all(records.map((record) => toApiSlot(record)));

  return slots.sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber;
    }

    return a.slotNumber - b.slotNumber;
  });
}

async function deleteBinderSlots(binderId: string) {
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

  const records = (result.Items ?? []) as BinderCardRecord[];

  for (let index = 0; index < records.length; index += 25) {
    const batch = records.slice(index, index + 25);

    await documentClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [getBinderCardsTableName()]: batch.map((record) => ({
            DeleteRequest: {
              Key: {
                binderId: record.binderId,
                slotKey: record.slotKey,
              },
            },
          })),
        },
      })
    );
  }
}

async function listBinders(userId: string) {
  const result = await documentClient.send(
    new QueryCommand({
      TableName: getBindersTableName(),
      KeyConditionExpression: "#userId = :userId",
      ExpressionAttributeNames: {
        "#userId": "userId",
      },
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    })
  );

  const binderRecords = (result.Items ?? []) as BinderRecord[];

  const binders = await Promise.all(
    binderRecords.map((record) => toApiBinder(record))
  );

  binders.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return jsonResponse(200, {
    binders,
  });
}

async function getBinder(userId: string, event: APIGatewayProxyEventV2) {
  const binderId = getBinderId(event);

  if (!binderId) {
    return jsonResponse(400, {
      message: "Missing binderId.",
    });
  }

  const binderRecord = await getBinderRecord(userId, binderId);

  if (!binderRecord) {
    return jsonResponse(404, {
      message: "Binder not found.",
    });
  }

  const slots = await getBinderSlots(binderId);

  return jsonResponse(200, {
    binder: await toApiBinder(binderRecord, slots),
  });
}

async function createBinder(event: APIGatewayProxyEventV2, userId: string) {
  const body = parseJsonBody(event);

  if (body === null) {
    return jsonResponse(400, {
      message: "Invalid JSON body.",
    });
  }

  const now = new Date().toISOString();

  const binderRecord: BinderRecord = {
    userId,
    binderId: `binder_${randomUUID()}`,
    name:
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : "Untitled Binder",
    description:
      typeof body.description === "string" ? body.description.trim() : "",
    pageNumber: 1,
    pageCount:
      typeof body.pageCount === "number" && body.pageCount > 0
        ? Math.min(body.pageCount, DEFAULT_PAGE_COUNT)
        : DEFAULT_PAGE_COUNT,
    previewPageColor:
      typeof body.previewPageColor === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(body.previewPageColor)
        ? body.previewPageColor
        : DEFAULT_PREVIEW_PAGE_COLOR,
    binderColor:
      typeof body.binderColor === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(body.binderColor)
        ? body.binderColor
        : DEFAULT_BINDER_COLOR,
    layout: getValidatedLayout(body.layout),
    isPublic: false,
    createdAt: now,
    updatedAt: now,
  };

  await documentClient.send(
    new PutCommand({
      TableName: getBindersTableName(),
      Item: binderRecord,
      ConditionExpression:
        "attribute_not_exists(userId) AND attribute_not_exists(binderId)",
    })
  );

  return jsonResponse(201, {
    binder: await toApiBinder(binderRecord),
  });
}

async function updateBinder(event: APIGatewayProxyEventV2, userId: string) {
  const binderId = getBinderId(event);

  if (!binderId) {
    return jsonResponse(400, {
      message: "Missing binderId.",
    });
  }

  const body = parseJsonBody(event);

  if (body === null) {
    return jsonResponse(400, {
      message: "Invalid JSON body.",
    });
  }

  const now = new Date().toISOString();

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : undefined;

  const description =
    typeof body.description === "string" ? body.description.trim() : undefined;

  const layout =
    body.layout === "2x2" || body.layout === "3x3"
      ? body.layout
      : undefined;

  const previewPageColor =
    typeof body.previewPageColor === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(body.previewPageColor)
      ? body.previewPageColor
      : undefined;

  const binderColor =
    typeof body.binderColor === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(body.binderColor)
      ? body.binderColor
      : undefined;

  const coverImageKey =
    typeof body.coverImageKey === "string" && body.coverImageKey.trim()
      ? body.coverImageKey.trim()
      : undefined;

  const updateParts = ["#updatedAt = :updatedAt"];
  const expressionAttributeNames: Record<string, string> = {
    "#updatedAt": "updatedAt",
  };
  const expressionAttributeValues: Record<string, unknown> = {
    ":updatedAt": now,
  };

  if (name !== undefined) {
    updateParts.push("#name = :name");
    expressionAttributeNames["#name"] = "name";
    expressionAttributeValues[":name"] = name;
  }

  if (description !== undefined) {
    updateParts.push("#description = :description");
    expressionAttributeNames["#description"] = "description";
    expressionAttributeValues[":description"] = description;
  }

  if (previewPageColor !== undefined) {
    updateParts.push("#previewPageColor = :previewPageColor");
    expressionAttributeNames["#previewPageColor"] = "previewPageColor";
    expressionAttributeValues[":previewPageColor"] = previewPageColor;
  }

  if (binderColor !== undefined) {
    updateParts.push("#binderColor = :binderColor");
    expressionAttributeNames["#binderColor"] = "binderColor";
    expressionAttributeValues[":binderColor"] = binderColor;
  }

  if (coverImageKey !== undefined) {
    updateParts.push("#coverImageKey = :coverImageKey");
    expressionAttributeNames["#coverImageKey"] = "coverImageKey";
    expressionAttributeValues[":coverImageKey"] = coverImageKey;
  }

  if (layout !== undefined) {
    updateParts.push("#layout = :layout");
    expressionAttributeNames["#layout"] = "layout";
    expressionAttributeValues[":layout"] = layout;
  }

  if (updateParts.length === 1) {
    return jsonResponse(400, {
      message: "No valid fields provided to update.",
    });
  }

  try {
    const result = await documentClient.send(
      new UpdateCommand({
        TableName: getBindersTableName(),
        Key: {
          userId: userId,
          binderId,
        },
        UpdateExpression: `SET ${updateParts.join(", ")}`,
        ConditionExpression:
          "attribute_exists(userId) AND attribute_exists(binderId)",
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
    );

    const updatedBinderRecord = result.Attributes as BinderRecord;
    const slots = await getBinderSlots(binderId);

    return jsonResponse(200, {
      binder: await toApiBinder(updatedBinderRecord, slots),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return jsonResponse(404, {
        message: "Binder not found.",
      });
    }

    throw error;
  }
}

async function deleteBinder(event: APIGatewayProxyEventV2, userId: string) {
  const binderId = getBinderId(event);

  if (!binderId) {
    return jsonResponse(400, {
      message: "Missing binderId.",
    });
  }

  const binderRecord = await getBinderRecord(userId, binderId);

  if (!binderRecord) {
    return jsonResponse(404, {
      message: "Binder not found.",
    });
  }

  await deleteBinderSlots(binderId);

  await documentClient.send(
    new DeleteCommand({
      TableName: getBindersTableName(),
      Key: {
        userId: userId,
        binderId,
      },
    })
  );

  return jsonResponse(200, {
    deletedBinderId: binderId,
  });
}

function generateShareId() {
  return `share-${randomUUID()}`;
}

async function createShareLink(event: APIGatewayProxyEventV2, userId: string) {
  const binderId = event.pathParameters?.binderId;

  if (!binderId) {
    return jsonResponse(400, {
      message: "Missing binderId.",
    });
  }

  const shareId = generateShareId();
  const updatedAt = new Date().toISOString();

  try {
    const result = await documentClient.send(
      new UpdateCommand({
        TableName: getBindersTableName(),
        Key: {
          userId,
          binderId,
        },
        UpdateExpression:
          "SET #isPublic = :isPublic, #shareId = :shareId, #updatedAt = :updatedAt",
        ConditionExpression:
          "attribute_exists(userId) AND attribute_exists(binderId)",
        ExpressionAttributeNames: {
          "#isPublic": "isPublic",
          "#shareId": "shareId",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":isPublic": true,
          ":shareId": shareId,
          ":updatedAt": updatedAt,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    const updatedBinderRecord = result.Attributes as BinderRecord;
    const slots = await getBinderSlots(binderId);

    return jsonResponse(200, {
      binder: await toApiBinder(updatedBinderRecord, slots),
      shareId,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return jsonResponse(404, {
        message: "Binder not found.",
      });
    }

    throw error;
  }
}

async function disableShareLink(event: APIGatewayProxyEventV2, userId: string) {
  const binderId = event.pathParameters?.binderId;

  if (!binderId) {
    return jsonResponse(400, {
      message: "Missing binderId.",
    });
  }

  const updatedAt = new Date().toISOString();

  try {
    const result = await documentClient.send(
      new UpdateCommand({
        TableName: getBindersTableName(),
        Key: {
          userId,
          binderId,
        },
        UpdateExpression:
          "SET #isPublic = :isPublic, #updatedAt = :updatedAt REMOVE #shareId",
        ConditionExpression:
          "attribute_exists(userId) AND attribute_exists(binderId)",
        ExpressionAttributeNames: {
          "#isPublic": "isPublic",
          "#updatedAt": "updatedAt",
          "#shareId": "shareId",
        },
        ExpressionAttributeValues: {
          ":isPublic": false,
          ":updatedAt": updatedAt,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    const updatedBinderRecord = result.Attributes as BinderRecord;
    const slots = await getBinderSlots(binderId);

    return jsonResponse(200, {
      binder: await toApiBinder(updatedBinderRecord, slots),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return jsonResponse(404, {
        message: "Binder not found.",
      });
    }

    throw error;
  }
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
  try {
    const userId = getUserIdFromEvent(event);
    const method = event.requestContext.http.method;
    const binderId = getBinderId(event);

    if (method === "GET" && !binderId) {
      return listBinders(userId);
    }

    if (method === "GET" && binderId) {
      return getBinder(userId, event);
    }

    if (method === "POST" && !binderId) {
      return createBinder(event, userId);
    }

    if (
      event.requestContext.http.method === "POST" &&
      event.rawPath.match(/^\/binders\/[^/]+\/share$/)
    ) {
      return createShareLink(event, userId);
    }

    if (
      event.requestContext.http.method === "DELETE" &&
      event.rawPath.match(/^\/binders\/[^/]+\/share$/)
    ) {
      return disableShareLink(event, userId);
    }

    if (method === "PUT" && binderId) {
      return updateBinder(event, userId);
    }

    if (method === "DELETE" && binderId) {
      return deleteBinder(event, userId);
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