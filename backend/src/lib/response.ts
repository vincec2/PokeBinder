export type JsonBody = Record<string, unknown> | unknown[];

export function jsonResponse(statusCode: number, body: JsonBody) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
    },
    body: JSON.stringify(body),
  };
}