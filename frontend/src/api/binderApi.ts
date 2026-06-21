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

type SlotImageUploadUrlResponse = {
  uploadUrl: string;
  imageKey: string;
};

type DeleteSlotImageResponse = {
  deletedSlotKeys: string[];
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

type CoverUploadUrlResponse = {
  uploadUrl: string;
  imageKey: string;
};

export type CreateBinderInput = {
  name?: string;
  description?: string;
  layout: BinderLayout;
  pageCount: number;
  previewPageColor: string;
  binderColor: string;
};

export type UpdateBinderInput = Partial<{
  name: string;
  description: string;
  layout: BinderLayout;
  previewPageColor: string;
  binderColor: string;
  coverImageKey: string;
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

export async function uploadBinderCoverImage(
  binderId: string,
  file: File
) {
  const data = await apiRequest<CoverUploadUrlResponse>("/uploads/cover-url", {
    method: "POST",
    body: JSON.stringify({
      binderId,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  });

  const uploadResponse = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Image upload failed with ${uploadResponse.status}`);
  }

  return updateBinder(binderId, {
    coverImageKey: data.imageKey,
  });
}

export async function uploadBinderSlotImage(input: {
  binderId: string;
  slotKey: string;
  pageNumber: number;
  slotNumber: number;
  file: File;
}) {
  const uploadData = await apiRequest<SlotImageUploadUrlResponse>(
    "/uploads/slot-image-url",
    {
      method: "POST",
      body: JSON.stringify({
        binderId: input.binderId,
        contentType: input.file.type,
        sizeBytes: input.file.size,
      }),
    }
  );

  const uploadResponse = await fetch(uploadData.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": input.file.type,
    },
    body: input.file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Image upload failed with ${uploadResponse.status}`);
  }

  const savedSlot = await apiRequest<SlotResponse>(
    `/binders/${encodeURIComponent(
      input.binderId
    )}/slot-images/${encodeURIComponent(input.slotKey)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        imageKey: uploadData.imageKey,
        fileName: input.file.name,
        pageNumber: input.pageNumber,
        slotNumber: input.slotNumber,
      }),
    }
  );

  return savedSlot.slot;
}

export async function deleteBinderSlotImage(
  binderId: string,
  slotKey: string
) {
  return apiRequest<DeleteSlotImageResponse>(
    `/binders/${encodeURIComponent(
      binderId
    )}/slot-images/${encodeURIComponent(slotKey)}`,
    {
      method: "DELETE",
    }
  );
}