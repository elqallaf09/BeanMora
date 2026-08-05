/**
 * xBloom integration adapter.
 *
 * IMPORTANT — read before touching this file:
 * - xBloom has no public API or OAuth integration today. Nothing in this
 *   file may call an undocumented/reverse-engineered xBloom endpoint.
 * - BeanMora never asks for or stores xBloom account credentials.
 * - `XBLOOM_DIRECT_SYNC_ENABLED` gates every "direct sync" affordance in the
 *   UI. It must stay `false` until an official API/partnership exists.
 *   Read from NEXT_PUBLIC_XBLOOM_DIRECT_SYNC_ENABLED so both server and
 *   client agree on the flag without a hydration mismatch.
 *
 * When official xBloom API access exists, implement the connected methods
 * as Server Actions / Edge Functions that:
 *   - store OAuth tokens encrypted, server-side only (integration_connections)
 *   - never expose tokens to the browser
 *   - write to xbloom_sync_jobs for retry + audit_logs for traceability
 *   - surface status as one of: "synced" | "pending" | "failed" | "needs_reconnect"
 */

export const XBLOOM_DIRECT_SYNC_ENABLED =
  process.env.NEXT_PUBLIC_XBLOOM_DIRECT_SYNC_ENABLED === "true";

export type XBloomSyncStatus = "synced" | "pending" | "failed" | "needs_reconnect";

export type XBloomDeviceModel = "xbloom_studio" | "xbloom_original";

export interface XBloomRecipeProfile {
  recipeId: string;
  deviceModel: XBloomDeviceModel;
  doseGrams: number;
  waterGrams: number;
  grindSetting: string;
  waterTempC: number;
  pours: Array<{ atSeconds: number; grams: number }>;
}

export interface XBloomConnectionStatus {
  connected: boolean;
  deviceModel?: XBloomDeviceModel;
  lastSyncedAt?: string;
}

/**
 * Fallback export/share options offered today, in place of a working
 * "Sync to xBloom" button. These are all things BeanMora can actually do
 * without an official integration.
 */
export type XBloomFallbackAction =
  | "save_in_beanmora"
  | "copy_settings"
  | "export_json"
  | "export_pdf_card"
  | "generate_qr"
  | "open_app_deep_link";

export const AVAILABLE_FALLBACK_ACTIONS: XBloomFallbackAction[] = [
  "save_in_beanmora",
  "copy_settings",
  "export_json",
  "export_pdf_card",
  "generate_qr",
  // "open_app_deep_link" is added only once an official deep-link scheme is
  // published by xBloom — omitted for now rather than guessed.
];

/**
 * Shape every future real implementation of this provider must satisfy.
 * The class below is the only implementation until an official API exists,
 * and every "connected" method throws rather than pretending to succeed.
 */
export interface XBloomIntegrationProvider {
  connectAccount(): Promise<never>;
  disconnectAccount(): Promise<never>;
  checkConnection(): Promise<XBloomConnectionStatus>;
  exportRecipe(profile: XBloomRecipeProfile): Promise<Blob | string>;
  syncRecipe(profile: XBloomRecipeProfile): Promise<never>;
  getSyncStatus(recipeId: string): Promise<XBloomSyncStatus>;
  savePreset(profile: XBloomRecipeProfile): Promise<never>;
}

class UnavailableXBloomIntegration implements XBloomIntegrationProvider {
  async connectAccount(): Promise<never> {
    throw new Error(
      "xBloom account connection requires an official API/partnership, which does not exist yet.",
    );
  }

  async disconnectAccount(): Promise<never> {
    throw new Error("No xBloom connection exists to disconnect.");
  }

  async checkConnection(): Promise<XBloomConnectionStatus> {
    // Always reports disconnected — there is no real connection possible.
    return { connected: false };
  }

  async exportRecipe(profile: XBloomRecipeProfile): Promise<string> {
    // The one real, working export path: a JSON blob the user can save or
    // hand to the xBloom app manually.
    return JSON.stringify(profile, null, 2);
  }

  async syncRecipe(): Promise<never> {
    throw new Error(
      "Direct sync to xBloom is not available. Use export/copy/QR instead.",
    );
  }

  async getSyncStatus(): Promise<XBloomSyncStatus> {
    return "needs_reconnect";
  }

  async savePreset(): Promise<never> {
    throw new Error(
      "Writing directly to an xBloom Studio preset requires the official xBloom app; BeanMora cannot do this yet.",
    );
  }
}

/**
 * Single entry point the UI should import. Swapping this for a real
 * implementation later is a one-line change once XBLOOM_DIRECT_SYNC_ENABLED
 * can safely be flipped to true.
 */
export const xbloomIntegration: XBloomIntegrationProvider =
  new UnavailableXBloomIntegration();
