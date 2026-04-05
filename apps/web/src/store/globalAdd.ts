import { create } from "zustand";

interface GlobalAddStore {
  // Which modal is open
  activeModal: "transaction" | "budget" | "debt" | null;
  open: (modal: "transaction" | "budget" | "debt") => void;
  close: () => void;
}

export const useGlobalAddStore = create<GlobalAddStore>((set) => ({
  activeModal: null,
  open: (modal) => set({ activeModal: modal }),
  close: () => set({ activeModal: null }),
}));
