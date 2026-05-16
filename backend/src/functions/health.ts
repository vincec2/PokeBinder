import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { jsonResponse } from "../lib/response";

export async function handler(event: APIGatewayProxyEventV2) {
  return jsonResponse(200, {
    ok: true,
    service: "pokebinder-api",
    route: event.rawPath,
    timestamp: new Date().toISOString(),
  });
}