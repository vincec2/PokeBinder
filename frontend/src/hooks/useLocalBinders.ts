import { useEffect, useState } from "react";
import type { Binder, BinderLayout } from "../types/binder";
import type { CardStatus, PokemonCard } from "../types/card";
import {
  createDefaultBinder,
  ensureSlotsForLayout,
  generateId,
  normalizeBinder,
} from "../lib/binderUtils";

const LEGACY_STORAGE_KEY = "pokebinder-local-binder";
const STORAGE_KEY = "pokebinder-local-state";

export type LocalBinderState = {
  activeBinderId: string;
  binders: Binder[];
};

function createDefaultState(): LocalBinderState {
  const firstBinder = createDefaultBinder();

  return {
    activeBinderId: firstBinder.binderId,
    binders: [firstBinder],
  };
}

function loadState(): LocalBinderState {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (savedState) {
    try {
      const parsedState = JSON.parse(savedState) as LocalBinderState;

      if (parsedState.binders?.length > 0 && parsedState.activeBinderId) {
        const normalizedBinders = parsedState.binders.map(normalizeBinder);

        const activeBinderExists = normalizedBinders.some(
          (binder) => binder.binderId === parsedState.activeBinderId
        );

        return {
          activeBinderId: activeBinderExists
            ? parsedState.activeBinderId
            : normalizedBinders[0].binderId,
          binders: normalizedBinders,
        };
      }
    } catch {
      // Fall through to legacy migration/default state.
    }
  }

  const legacyBinder = localStorage.getItem(LEGACY_STORAGE_KEY);

  if (legacyBinder) {
    try {
      const parsedLegacyBinder = JSON.parse(legacyBinder) as Binder;

      if (parsedLegacyBinder.binderId && parsedLegacyBinder.slots?.length > 0) {
        const normalizedBinder = normalizeBinder(parsedLegacyBinder);

        return {
          activeBinderId: normalizedBinder.binderId,
          binders: [normalizedBinder],
        };
      }
    } catch {
      // Fall through to default state.
    }
  }

  return createDefaultState();
}

export function useLocalBinders() {
  const [state, setState] = useState<LocalBinderState>(() => loadState());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function updateBinder(
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

  function setActiveBinder(binderId: string) {
    setState((currentState) => ({
      ...currentState,
      activeBinderId: binderId,
    }));
  }

  function selectCard(
    binderId: string,
    slotKey: string,
    card: PokemonCard
  ) {
    updateBinder(binderId, (currentBinder) => ({
      ...currentBinder,
      slots: currentBinder.slots.map((slot) => {
        if (slot.slotKey !== slotKey) {
          return slot;
        }

        return {
          ...slot,
          card,
          status: "owned",
          quantity: 1,
          updatedAt: new Date().toISOString(),
        };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeCard(binderId: string, slotKey: string) {
    updateBinder(binderId, (currentBinder) => ({
      ...currentBinder,
      slots: currentBinder.slots.map((slot) => {
        if (slot.slotKey !== slotKey) {
          return slot;
        }

        return {
          ...slot,
          card: null,
          status: "missing",
          quantity: 0,
          notes: "",
          updatedAt: new Date().toISOString(),
        };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }

  function changeStatus(
    binderId: string,
    slotKey: string,
    status: CardStatus
  ) {
    updateBinder(binderId, (currentBinder) => ({
      ...currentBinder,
      slots: currentBinder.slots.map((slot) => {
        if (slot.slotKey !== slotKey) {
          return slot;
        }

        return {
          ...slot,
          status,
          updatedAt: new Date().toISOString(),
        };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateBinderName(binderId: string, name: string) {
    updateBinder(binderId, (currentBinder) => ({
      ...currentBinder,
      name,
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateBinderDescription(
    binderId: string,
    description: string
  ) {
    updateBinder(binderId, (currentBinder) => ({
      ...currentBinder,
      description,
      updatedAt: new Date().toISOString(),
    }));
  }

  function changeLayout(binderId: string, layout: BinderLayout) {
    updateBinder(binderId, (currentBinder) =>
      ensureSlotsForLayout(currentBinder, layout)
    );
  }

  function createShareLink(binderId: string) {
    const existingBinder = state.binders.find(
      (binder) => binder.binderId === binderId
    );

    const shareId = existingBinder?.shareId ?? generateId("share");

    updateBinder(binderId, (currentBinder) => ({
      ...currentBinder,
      isPublic: true,
      shareId,
      updatedAt: new Date().toISOString(),
    }));

    return shareId;
  }

  function disableShareLink(binderId: string) {
    updateBinder(binderId, (currentBinder) => ({
      ...currentBinder,
      isPublic: false,
      shareId: null,
      updatedAt: new Date().toISOString(),
    }));
  }

  function createBinder() {
    const newBinder = createDefaultBinder(
      `Binder ${state.binders.length + 1}`
    );

    setState((currentState) => ({
      activeBinderId: newBinder.binderId,
      binders: [...currentState.binders, newBinder],
    }));

    return newBinder.binderId;
  }

  function deleteBinder(binderId: string) {
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

    return nextActiveBinderId;
  }

  function resetAllLocalData() {
    const freshState = createDefaultState();

    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));

    setState(freshState);

    return freshState.activeBinderId;
  }

  const lastActiveBinderId =
    state.binders.find((binder) => binder.binderId === state.activeBinderId)
      ?.binderId ?? state.binders[0].binderId;

  return {
    state,
    lastActiveBinderId,
    setActiveBinder,
    selectCard,
    removeCard,
    changeStatus,
    updateBinderName,
    updateBinderDescription,
    changeLayout,
    createShareLink,
    disableShareLink,
    createBinder,
    deleteBinder,
    resetAllLocalData,
  };
}