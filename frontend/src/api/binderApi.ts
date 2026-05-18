import type { Binder, BinderLayout, BinderSlot } from "../types/binder";
import { getStoredAuthSession } from "../auth/cognito";

const API_BASE_URL = import.meta.env.VITE_API_URL as string | undefined;

type ApiErrorBody = {
  message?: string;
};

type BinderResponse = {
  binder: Binder;
};

type BindersResponse = {
  binders: Binder[];
};

type SlotResponse = {
  slot: BinderSlot;
};

type DeleteBinderResponse = {
  deletedBinderId: string;
};

type DeleteSlotResponse = {
  deletedSlotKey: string;
};

type ShareResponse = {
  binder: Binder;
  shareId: string;
};

export type CreateBinderInput = {
  name?: string;
  description?: string;
  layout: BinderLayout;
  pageCount: number;
  previewPageColor: string;
};

export type UpdateBinderInput = Partial<{
  name: string;
  description: string;
  layout: BinderLayout;
  previewPageColor: string;
}>;

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error(
      "Missing VITE_API_URL. Add it to frontend/.env.local and restart Vite."
    );
  }

  return API_BASE_URL.replace(/\/$/, "");
}

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.message ?? `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const session = getStoredAuthSession();

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(`${options.method ?? "GET"} ${path}: ${message}`);
  }

  return response.json() as Promise<T>;
}

async function publicApiRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`);

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(`GET ${path}: ${message}`);
  }

  return response.json() as Promise<T>;
}

export async function getBinders() {
  const data = await apiRequest<BindersResponse>("/binders");
  return data.binders;
}

export async function getBinder(binderId: string) {
  const data = await apiRequest<BinderResponse>(
    `/binders/${encodeURIComponent(binderId)}`
  );

  return data.binder;
}

export async function createBinder(input: CreateBinderInput) {
  const data = await apiRequest<BinderResponse>("/binders", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return data.binder;
}

export async function updateBinder(
  binderId: string,
  input: UpdateBinderInput
) {
  const data = await apiRequest<BinderResponse>(
    `/binders/${encodeURIComponent(binderId)}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    }
  );

  return data.binder;
}

export async function deleteBinder(binderId: string) {
  const data = await apiRequest<DeleteBinderResponse>(
    `/binders/${encodeURIComponent(binderId)}`,
    {
      method: "DELETE",
    }
  );

  return data.deletedBinderId;
}

export async function upsertBinderCard(
  binderId: string,
  slotKey: string,
  slot: BinderSlot
) {
  if (!slot.card) {
    throw new Error("Cannot save an empty card slot.");
  }

  const data = await apiRequest<SlotResponse>(
    `/binders/${encodeURIComponent(binderId)}/cards/${encodeURIComponent(
      slotKey
    )}`,
    {
      method: "PUT",
      body: JSON.stringify({
        card: slot.card,
        status: slot.status,
        quantity: slot.quantity,
        notes: slot.notes,
      }),
    }
  );

  return data.slot;
}

export async function deleteBinderCard(binderId: string, slotKey: string) {
  const data = await apiRequest<DeleteSlotResponse>(
    `/binders/${encodeURIComponent(binderId)}/cards/${encodeURIComponent(
      slotKey
    )}`,
    {
      method: "DELETE",
    }
  );

  return data.deletedSlotKey;
}

export async function createBinderShareLink(binderId: string) {
  const data = await apiRequest<ShareResponse>(
    `/binders/${encodeURIComponent(binderId)}/share`,
    {
      method: "POST",
    }
  );

  return data;
}

export async function disableBinderShareLink(binderId: string) {
  const data = await apiRequest<BinderResponse>(
    `/binders/${encodeURIComponent(binderId)}/share`,
    {
      method: "DELETE",
    }
  );

  return data.binder;
}

export async function getPublicBinder(shareId: string) {
  const data = await publicApiRequest<BinderResponse>(
    `/public/binders/${encodeURIComponent(shareId)}`
  );

  return data.binder;
}