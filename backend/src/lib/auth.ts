import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";

const FALLBACK_TEST_USER_ID = "test-user-local";

export function getUserIdFromEvent(event: APIGatewayProxyEventV2) {
  const jwtEvent = event as APIGatewayProxyEventV2WithJWTAuthorizer;
  const claims = jwtEvent.requestContext.authorizer?.jwt.claims;

  const userId = claims?.sub;

  if (typeof userId === "string" && userId.length > 0) {
    return userId;
  }

  return FALLBACK_TEST_USER_ID;
}