"use client";

import { create } from "zustand";

export type PaletteMode = "all" | "history";

interface CommandPaletteState {
  open: boolean;
  query: string;
  mode: PaletteMode;
  openPalette: (mode?: PaletteMode) => void;
  closePalette: () => void;
  togglePalette: () => void;
  setQuery: (q: string) => void;
}

export const useCommandPalette = create<CommandPaletteState>((set, get) => ({
  open: false,
  query: "",
  mode: "all",
  openPalette: (mode = "all") => set({ open: true, query: "", mode }),
  closePalette: () => set({ open: false, query: "" }),
  togglePalette: () => {
    const { open } = get();
    set({ open: !open, query: "", mode: "all" });
  },
  setQuery: (q) => set({ query: q }),
}));
