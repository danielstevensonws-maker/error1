/**
 * The six screen effects, and what they are called.
 *
 * This file used to hold a collapsible atmosphere panel too. The DM screen's
 * console absorbed it — effects belong in a tab beside sound and music rather
 * than in a panel of their own — but the TYPE stayed here, because six modules
 * import it and moving it would be churn for nothing.
 *
 * EFFECTS ARE EPHEMERAL (Brief 10 §4). Thunder has no replay value: nobody
 * reconnecting wants the last hour of weather replayed at them, and a log full
 * of "shake" buries the story it exists to hold. They go out on the channel,
 * they land, they are gone — the opposite of the rule for everything the
 * composer sends, and the difference is whether it belongs to the play RECORD.
 */

/** The six a DM can trigger. Mirrors EffectIdSchema in contracts. */
export type EffectId = 'shake' | 'torch' | 'rain' | 'thunder' | 'blood' | 'fade';
