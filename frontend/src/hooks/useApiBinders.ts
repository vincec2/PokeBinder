import { useCallback, useEffect, useRef, useState } from "react";
import {
  createBinder as apiCreateBinder,
  deleteBinder as apiDeleteBinder,
  deleteBinderCard,
  getBinder,
  getBinders,
  updateBinder as apiUpdateBinder,
  type UpdateBinderInput,
  upsertBinderCard,
  createBinderShareLink,
  disableBinderShareLink,
} from "../api/binderApi";
import {
  createDefaultBinder,
  normalizeBinder,
} from "../lib/binderUtils";
import type { Binder, BinderLayout, BinderSlot } from "../types/binder";
import { MAX_BINDER_PAGES } from "../types/binder";
import type { CardStatus, PokemonCard } from "../types/card";

const API_ACTIVE_BINDER_STORAGE_KEY = "pokebinder-api-active-binder-id";

export type ApiBinderState = {
  activeBinderId: string;
  binders: Binder[];
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function normalizeApiBinder(binder: Binder): Binder {
  return normalizeBinder({
    ...binder,
    pageNumber: binder.pageNumber ?? 1,
    pageCount: binder.pageCount ?? MAX_BINDER_PAGES,
    isPublic: binder.isPublic ?? false,
    shareId: binder.shareId ?? null,
    previewPageColor: binder.previewPageColor ?? "#1b1814",
    slots: binder.slots ?? [],
  });
}

function mergeBinderMetadata(currentBinder: Binder, savedBinder: Binder): Binder {
  return normalizeApiBinder({
    ...currentBinder,
    ...savedBinder,
    slots: savedBinder.slots ?? currentBinder.slots,
  });
}

export function useApiBinders(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const [state, setState] = useState<ApiBinderState>({
    activeBinderId: "",
    binders: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pendingBinderUpdates = useRef<Record<string, UpdateBinderInput>>({});
  const updateTimers = useRef<Record<string, number>>({});

  function replaceBinder(updatedBinder: Binder) {
    setState((currentState) => ({
      ...currentState,
      binders: currentState.binders.map((binder) =>
        binder.binderId === updatedBinder.binderId
          ? normalizeApiBinder(updatedBinder)
          : binder
      ),
    }));
  }

  function mergeSavedBinder(savedBinder: Binder) {
    setState((currentState) => ({
      ...currentState,
      binders: currentState.binders.map((binder) =>
        binder.binderId === savedBinder.binderId
          ? mergeBinderMetadata(binder, savedBinder)
          : binder
      ),
    }));
  }

  function updateBinderLocally(
    binderId: string,
    updater: (binder: Binder) => Binder
  ) {
    setState((currentState) => ({
      ...currentState,
      binders: currentState.binders.map((binder) => {
        if (binder.binderId !== binderId) {
          return binder;
        }

        return updater(binder);
      }),
    }));
  }

  function replaceSlotLocally(binderId: string, updatedSlot: BinderSlot) {
    updateBinderLocally(binderId, (currentBinder) => ({
      ...currentBinder,
      slots: currentBinder.slots.map((slot) =>
        slot.slotKey === updatedSlot.slotKey ? updatedSlot : slot
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  const reloadBinders = useCallback(async () => {
    if (!enabled) {
      setState({
        activeBinderId: "",
        binders: [],
      });
      setIsLoading(false);
      setErrorMessage(null);
      return "";
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const binderSummaries = await getBinders();

      if (binderSummaries.length === 0) {
        const template = createDefaultBinder();

        const createdBinder = await apiCreateBinder({
          name: template.name,
          description: template.description,
          layout: template.layout,
          pageCount: template.pageCount,
          previewPageColor: template.previewPageColor,
        });

        const normalizedBinder = normalizeApiBinder(createdBinder);

        localStorage.setItem(
          API_ACTIVE_BINDER_STORAGE_KEY,
          normalizedBinder.binderId
        );

        setState({
          activeBinderId: normalizedBinder.binderId,
          binders: [normalizedBinder],
        });

        return normalizedBinder.binderId;
      }

      const fullBinders = await Promise.all(
        binderSummaries.map(async (binder) => {
          try {
            return await getBinder(binder.binderId);
          } catch {
            return binder;
          }
        })
      );

      const normalizedBinders = fullBinders.map(normalizeApiBinder);

      const savedActiveBinderId = localStorage.getItem(
        API_ACTIVE_BINDER_STORAGE_KEY
      );

      const activeBinderId =
        normalizedBinders.find(
          (binder) => binder.binderId === savedActiveBinderId
        )?.binderId ?? normalizedBinders[0].binderId;

      localStorage.setItem(API_ACTIVE_BINDER_STORAGE_KEY, activeBinderId);

      setState({
        activeBinderId,
        binders: normalizedBinders,
      });

      return activeBinderId;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return "";
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reloadBinders();
  }, [reloadBinders]);

  useEffect(() => {
    return () => {
      Object.values(updateTimers.current).forEach((timerId) =>
        window.clearTimeout(timerId)
      );
    };
  }, []);

  function scheduleBinderUpdate(binderId: string, input: UpdateBinderInput) {
    pendingBinderUpdates.current[binderId] = {
      ...pendingBinderUpdates.current[binderId],
      ...input,
    };

    window.clearTimeout(updateTimers.current[binderId]);

    updateTimers.current[binderId] = window.setTimeout(async () => {
      const pendingUpdate = pendingBinderUpdates.current[binderId];

      delete pendingBinderUpdates.current[binderId];
      delete updateTimers.current[binderId];

      try {
        const savedBinder = await apiUpdateBinder(binderId, pendingUpdate);
        mergeSavedBinder(savedBinder);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    }, 600);
  }

  function setActiveBinder(binderId: string) {
    localStorage.setItem(API_ACTIVE_BINDER_STORAGE_KEY, binderId);

    setState((currentState) => ({
      ...currentState,
      activeBinderId: binderId,
    }));
  }

  async function selectCard(
    binderId: string,
    slotKey: string,
    card: PokemonCard
  ) {
    const currentSlot = state.binders
      .find((binder) => binder.binderId === binderId)
      ?.slots.find((slot) => slot.slotKey === slotKey);

    if (!currentSlot) {
      return;
    }

    const updatedSlot: BinderSlot = {
      ...currentSlot,
      card,
      status: "owned",
      quantity: 1,
      updatedAt: new Date().toISOString(),
    };

    replaceSlotLocally(binderId, updatedSlot);

    try {
      const savedSlot = await upsertBinderCard(binderId, slotKey, updatedSlot);
      replaceSlotLocally(binderId, savedSlot);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      await reloadBinders();
    }
  }

  async function removeCard(binderId: string, slotKey: string) {
    const currentSlot = state.binders
      .find((binder) => binder.binderId === binderId)
      ?.slots.find((slot) => slot.slotKey === slotKey);

    if (!currentSlot) {
      return;
    }

    const emptiedSlot: BinderSlot = {
      ...currentSlot,
      card: null,
      status: "missing",
      quantity: 0,
      notes: "",
      updatedAt: new Date().toISOString(),
    };

    replaceSlotLocally(binderId, emptiedSlot);

    try {
      await deleteBinderCard(binderId, slotKey);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      await reloadBinders();
    }
  }

  async function changeStatus(
    binderId: string,
    slotKey: string,
    status: CardStatus
  ) {
    const currentSlot = state.binders
      .find((binder) => binder.binderId === binderId)
      ?.slots.find((slot) => slot.slotKey === slotKey);

    if (!currentSlot) {
      return;
    }

    const updatedSlot: BinderSlot = {
      ...currentSlot,
      status,
      updatedAt: new Date().toISOString(),
    };

    replaceSlotLocally(binderId, updatedSlot);

    if (!updatedSlot.card) {
      return;
    }

    try {
      const savedSlot = await upsertBinderCard(binderId, slotKey, updatedSlot);
      replaceSlotLocally(binderId, savedSlot);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      await reloadBinders();
    }
  }

  function updateBinderName(binderId: string, name: string) {
    updateBinderLocally(binderId, (currentBinder) => ({
      ...currentBinder,
      name,
      updatedAt: new Date().toISOString(),
    }));

    scheduleBinderUpdate(binderId, { name });
  }

  function updateBinderDescription(binderId: string, description: string) {
    updateBinderLocally(binderId, (currentBinder) => ({
      ...currentBinder,
      description,
      updatedAt: new Date().toISOString(),
    }));

    scheduleBinderUpdate(binderId, { description });
  }

  async function createShareLink(binderId: string) {
    try {
      const result = await createBinderShareLink(binderId);
      const savedBinder = normalizeApiBinder(result.binder);

      replaceBinder(savedBinder);

      return result.shareId;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return "";
    }
  }

  async function disableShareLink(binderId: string) {
    try {
      const savedBinder = await disableBinderShareLink(binderId);
      replaceBinder(savedBinder);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function createBinder(layout: BinderLayout) {
    const template = createDefaultBinder(
      `Binder ${state.binders.length + 1}`,
      layout
    );

    try {
      const createdBinder = await apiCreateBinder({
        name: template.name,
        description: template.description,
        layout: template.layout,
        pageCount: template.pageCount,
        previewPageColor: template.previewPageColor,
      });

      const normalizedBinder = normalizeApiBinder(createdBinder);

      localStorage.setItem(
        API_ACTIVE_BINDER_STORAGE_KEY,
        normalizedBinder.binderId
      );

      setState((currentState) => ({
        activeBinderId: normalizedBinder.binderId,
        binders: [...currentState.binders, normalizedBinder],
      }));

      return normalizedBinder.binderId;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return state.activeBinderId;
    }
  }

  async function deleteBinder(binderId: string) {
    if (state.binders.length <= 1) {
      return state.activeBinderId;
    }

    const remainingBinders = state.binders.filter(
      (binder) => binder.binderId !== binderId
    );

    const nextActiveBinderId =
      state.activeBinderId === binderId
        ? remainingBinders[0].binderId
        : state.activeBinderId;

    setState({
      activeBinderId: nextActiveBinderId,
      binders: remainingBinders,
    });

    localStorage.setItem(API_ACTIVE_BINDER_STORAGE_KEY, nextActiveBinderId);

    try {
      await apiDeleteBinder(binderId);
      return nextActiveBinderId;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      await reloadBinders();
      return state.activeBinderId;
    }
  }

  async function resetAllLocalData() {
    localStorage.removeItem(API_ACTIVE_BINDER_STORAGE_KEY);
    return reloadBinders();
  }

  function updatePreviewPageColor(binderId: string, previewPageColor: string) {
    const isValidHexColor = /^#[0-9a-fA-F]{6}$/.test(previewPageColor);

    if (!isValidHexColor) {
      return;
    }

    updateBinderLocally(binderId, (currentBinder) => ({
      ...currentBinder,
      previewPageColor,
      updatedAt: new Date().toISOString(),
    }));

    scheduleBinderUpdate(binderId, { previewPageColor });
  }

  const lastActiveBinderId =
    state.binders.find((binder) => binder.binderId === state.activeBinderId)
      ?.binderId ??
    state.binders[0]?.binderId ??
    "";

  return {
    state,
    lastActiveBinderId,
    isLoading,
    errorMessage,
    reloadBinders,
    setActiveBinder,
    selectCard,
    removeCard,
    changeStatus,
    updateBinderName,
    updateBinderDescription,
    createShareLink,
    disableShareLink,
    createBinder,
    deleteBinder,
    resetAllLocalData,
    updatePreviewPageColor,
  };
}