import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { jsonResponse } from "../lib/response";

const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
const INVITE_CODE = process.env.INVITE_CODE;

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

function getStringField(body: Record<string, unknown>, fieldName: string) {
  const value = body[fieldName];

  return typeof value === "string" ? value.trim() : "";
}

export async function handler(event: APIGatewayProxyEventV2) {
  if (!USER_POOL_CLIENT_ID || !INVITE_CODE) {
    return jsonResponse(500, {
      message: "Auth environment variables are not configured.",
    });
  }

  if (event.requestContext.http.method !== "POST") {
    return jsonResponse(405, {
      message: "Method not allowed.",
    });
  }

  const body = parseJsonBody(event);

  if (body === null) {
    return jsonResponse(400, {
      message: "Invalid JSON body.",
    });
  }

  const email = getStringField(body, "email").toLowerCase();
  const password = getStringField(body, "password");
  const inviteCode = getStringField(body, "inviteCode");

  if (!email || !password || !inviteCode) {
    return jsonResponse(400, {
      message: "Email, password, and invite code are required.",
    });
  }

  if (inviteCode !== INVITE_CODE) {
    return jsonResponse(403, {
      message: "Invalid invite code.",
    });
  }

  const cognitoClient = new CognitoIdentityProviderClient({});

  try {
    await cognitoClient.send(
      new SignUpCommand({
        ClientId: USER_POOL_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          {
            Name: "email",
            Value: email,
          },
        ],
      })
    );

    return jsonResponse(200, {
      message: "Registration started. Check your email for a confirmation code.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "UsernameExistsException"
    ) {
      return jsonResponse(409, {
        message:
          "An account with this email already exists. Try logging in or confirming your account.",
      });
    }

    if (
      error instanceof Error &&
      error.name === "InvalidPasswordException"
    ) {
      return jsonResponse(400, {
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.name === "InvalidParameterException"
    ) {
      return jsonResponse(400, {
        message: error.message,
      });
    }

    console.error(error);

    return jsonResponse(500, {
      message: "Could not register account.",
    });
  }
}