import { STORE_NAME_ALIASES } from "./constants";

export const normalizeStoreName = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim();
  const key = trimmed.toLowerCase();
  return STORE_NAME_ALIASES[key] || trimmed;
};

export const extractPrice = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

export const getBrandDisplayName = (product: any) => {
  const name =
    product?.brand_display_name ||
    product?.brand ||
    product?.name_with_brand ||
    product?.name ||
    "";

  return typeof name === "string" ? name : String(name);
};

export const formatLastUpdated = (timestamp: string | null) => {
  if (!timestamp) return "Unknown";

  const now = new Date();
  const updated = new Date(timestamp);
  const diffHours = Math.floor(
    (now.getTime() - updated.getTime()) / (1000 * 60 * 60),
  );

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

export const getFreshnessStatus = (timestamp: string | null) => {
  if (!timestamp) return "Unknown";

  const now = new Date();
  const updated = new Date(timestamp);
  const diffHours = Math.floor(
    (now.getTime() - updated.getTime()) / (1000 * 60 * 60),
  );

  if (diffHours < 1) return "Fresh";
  if (diffHours < 6) return "Recent";
  return "Stale";
};

export const getFreshnessColor = (timestamp: string | null) => {
  const { tokens } = require("../../../theme/tokens");
  
  if (!timestamp) return tokens.colors.ink2;

  const now = new Date();
  const updated = new Date(timestamp);
  const diffHours = Math.floor(
    (now.getTime() - updated.getTime()) / (1000 * 60 * 60),
  );

  if (diffHours < 1) return tokens.colors.success;
  if (diffHours < 6) return "#f59e0b";
  return tokens.colors.error;
};
