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

const TEST_USER_ID = "test-user-local";

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

function toApiBinder(record: BinderRecord, slots: BinderSlot[] = []): Binder {
  return {
    ...record,
    slots,
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

async function getBinderRecord(binderId: string) {
  const result = await documentClient.send(
    new GetCommand({
      TableName: getBindersTableName(),
      Key: {
        userId: TEST_USER_ID,
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

  return records
    .map(toApiSlot)
    .sort(
      (a, b) =>
        a.pageNumber - b.pageNumber || a.slotNumber - b.slotNumber
    );
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

async function listBinders() {
  const result = await documentClient.send(
    new QueryCommand({
      TableName: getBindersTableName(),
      KeyConditionExpression: "#userId = :userId",
      ExpressionAttributeNames: {
        "#userId": "userId",
      },
      ExpressionAttributeValues: {
        ":userId": TEST_USER_ID,
      },
    })
  );

  const binderRecords = (result.Items ?? []) as BinderRecord[];

  const binders = binderRecords
    .map((record) => toApiBinder(record))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return jsonResponse(200, {
    binders,
  });
}

async function getBinder(event: APIGatewayProxyEventV2) {
  const binderId = getBinderId(event);

  if (!binderId) {
    return jsonResponse(400, {
      message: "Missing binderId.",
    });
  }

  const binderRecord = await getBinderRecord(binderId);

  if (!binderRecord) {
    return jsonResponse(404, {
      message: "Binder not found.",
    });
  }

  const slots = await getBinderSlots(binderId);

  return jsonResponse(200, {
    binder: toApiBinder(binderRecord, slots),
  });
}

async function createBinder(event: APIGatewayProxyEventV2) {
  const body = parseJsonBody(event);

  if (body === null) {
    return jsonResponse(400, {
      message: "Invalid JSON body.",
    });
  }

  const now = new Date().toISOString();

  const binderRecord: BinderRecord = {
    userId: TEST_USER_ID,
    binderId: `binder_${randomUUID()}`,
    name:
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : "Untitled Binder",
    description:
      typeof body.description === "string" ? body.description.trim() : "",
    pageNumber: 1,
    layout: getValidatedLayout(body.layout),
    isPublic: false,
    shareId: null,
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
    binder: toApiBinder(binderRecord),
  });
}

async function updateBinder(event: APIGatewayProxyEventV2) {
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
          userId: TEST_USER_ID,
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
      binder: toApiBinder(updatedBinderRecord, slots),
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

async function deleteBinder(event: APIGatewayProxyEventV2) {
  const binderId = getBinderId(event);

  if (!binderId) {
    return jsonResponse(400, {
      message: "Missing binderId.",
    });
  }

  const binderRecord = await getBinderRecord(binderId);

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
        userId: TEST_USER_ID,
        binderId,
      },
    })
  );

  return jsonResponse(200, {
    deletedBinderId: binderId,
  });
}

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const method = event.requestContext.http.method;
    const binderId = getBinderId(event);

    if (method === "GET" && !binderId) {
      return listBinders();
    }

    if (method === "GET" && binderId) {
      return getBinder(event);
    }

    if (method === "POST" && !binderId) {
      return createBinder(event);
    }

    if (method === "PUT" && binderId) {
      return updateBinder(event);
    }

    if (method === "DELETE" && binderId) {
      return deleteBinder(event);
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