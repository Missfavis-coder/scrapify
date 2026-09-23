import { Actor } from "apify";
import { logger } from "../utils/logger.js";

export type PPEEventName = "discovery_completed" | "workflow_run" | "repair_performed";

/**
 * Service to manage Apify Actor capabilities and Pay-Per-Event (PPE) monetization.
 */
export class ApifyService {
  /**
   * Checks if running inside an active Apify Actor environment.
   */
  static isApify(): boolean {
    return Actor.isAtHome();
  }

  /**
   * Charges a Pay-Per-Event (PPE) monetization event.
   * Required for hackathon PPE scoring.
   */
  static async charge(eventName: PPEEventName, count: number = 1): Promise<void> {
    try {
      if (this.isApify()) {
        logger.info("Charging Apify PPE event", { eventName, count });
        await Actor.charge({ eventName, count });
      } else {
        logger.info("[Local Mock] Apify PPE event charged", { eventName, count });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn("Apify PPE charge failed or not configured", { eventName, error: msg });
    }
  }

  /**
   * Pushes extracted structured records into the Apify Dataset.
   */
  static async pushData(data: Record<string, unknown>[] | Record<string, unknown>): Promise<void> {
    try {
      if (this.isApify()) {
        logger.info("Pushing data to Apify Dataset", {
          count: Array.isArray(data) ? data.length : 1,
        });
        await Actor.pushData(data);
      } else {
        logger.debug("[Local Mock] Data pushed to Apify Dataset", {
          count: Array.isArray(data) ? data.length : 1,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Failed to push to Apify Dataset", { error: msg });
    }
  }
}
