import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const AWS_REGION = import.meta.env.VITE_AWS_REGION as string | undefined;
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as
  | string
  | undefined;

const AUTH_STORAGE_KEY = "pokebinder-auth-session";

export type AuthSession = {
  email: string;
  idToken: string;
  accessToken: string;
  refreshToken: string;
};

function getCognitoConfig() {
  if (!AWS_REGION || !COGNITO_CLIENT_ID) {
    throw new Error(
      "Missing Cognito environment variables. Check frontend/.env.local."
    );
  }

  return {
    region: AWS_REGION,
    clientId: COGNITO_CLIENT_ID,
  };
}

function createCognitoClient() {
  const { region } = getCognitoConfig();

  return new CognitoIdentityProviderClient({
    region,
  });
}

export function getStoredAuthSession() {
  const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!savedSession) {
    return null;
  }

  try {
    return JSON.parse(savedSession) as AuthSession;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function saveAuthSession(session: AuthSession) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function registerUser(email: string, password: string) {
  const client = createCognitoClient();
  const { clientId } = getCognitoConfig();

  await client.send(
    new SignUpCommand({
      ClientId: clientId,
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
}

export async function confirmUser(email: string, confirmationCode: string) {
  const client = createCognitoClient();
  const { clientId } = getCognitoConfig();

  await client.send(
    new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: confirmationCode,
    })
  );
}

export async function loginUser(email: string, password: string) {
  const client = createCognitoClient();
  const { clientId } = getCognitoConfig();

  const response = await client.send(
    new InitiateAuthCommand({
      ClientId: clientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    })
  );

  const authResult = response.AuthenticationResult;

  if (
    !authResult?.IdToken ||
    !authResult.AccessToken ||
    !authResult.RefreshToken
  ) {
    throw new Error("Login failed. Cognito did not return a full session.");
  }

  const session: AuthSession = {
    email,
    idToken: authResult.IdToken,
    accessToken: authResult.AccessToken,
    refreshToken: authResult.RefreshToken,
  };

  saveAuthSession(session);

  return session;
}

export async function logoutUser() {
  const session = getStoredAuthSession();

  clearAuthSession();

  if (!session?.accessToken) {
    return;
  }

  const client = createCognitoClient();

  try {
    await client.send(
      new GlobalSignOutCommand({
        AccessToken: session.accessToken,
      })
    );
  } catch {
    // Local logout still succeeds even if Cognito global sign-out fails.
  }
}