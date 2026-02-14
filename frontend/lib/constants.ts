// Shared position colors — brighter for dark backgrounds
export const POSITION_COLORS = {
  GKP: { bg: "bg-amber-400", text: "text-amber-400", border: "border-amber-400", gradient: "from-amber-400 to-amber-500" },
  DEF: { bg: "bg-sky-400", text: "text-sky-400", border: "border-sky-400", gradient: "from-sky-400 to-sky-500" },
  MID: { bg: "bg-emerald-400", text: "text-emerald-400", border: "border-emerald-400", gradient: "from-emerald-400 to-emerald-500" },
  FWD: { bg: "bg-rose-400", text: "text-rose-400", border: "border-rose-400", gradient: "from-rose-400 to-rose-500" },
} as const;

export const POSITION_LABELS: Record<string, string> = {
  GKP: "GK",
  DEF: "DEF",
  MID: "MID",
  FWD: "FWD",
};

export const POSITION_NAMES: Record<string, string> = {
  GKP: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

export const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-emerald-500 text-white",
  2: "bg-emerald-400 text-white",
  3: "bg-amber-400 text-gray-900",
  4: "bg-rose-400 text-white",
  5: "bg-rose-600 text-white",
};

// User-friendly metric labels (no jargon)
export const METRIC_LABELS = {
  predicted_points: "Predicted Pts",
  confidence: "Certainty",
  form: "Form",
  total_points: "Total Points",
  ownership: "Ownership",
  price: "Price",
} as const;
