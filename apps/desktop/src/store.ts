import { create } from "zustand";
import type { Feature } from "@clipwise/shared";

type Style = "startup" | "github" | "portfolio" | "tutorial" | "launch" | "social";

interface State {
  url: string;
  projectName: string;
  style: Style;
  aspectRatio: "16:9" | "9:16" | "1:1";
  status: string;
  features: Feature[];
  selected: string[];
  runId: string | null;
  videoPath: string | null;
  videoUrl: string | null;
  plan: unknown | null;
  pages: unknown[];
  set: (patch: Partial<State>) => void;
  toggleFeature: (id: string) => void;
}

export const useStore = create<State>((set) => ({
  url: "",
  projectName: "",
  style: "startup",
  aspectRatio: "16:9",
  status: "Ready",
  features: [],
  selected: [],
  runId: null,
  videoPath: null,
  videoUrl: null,
  plan: null,
  pages: [],
  set: (patch) => set(patch),
  toggleFeature: (id) => set((state) => ({
    selected: state.selected.includes(id) ? state.selected.filter(x => x !== id) : [...state.selected, id]
  }))
}));
