import { PRESENCE_CRITERION, type CellReview } from "./cell-reviews";

export type AssistedReview = {
  generatedAt: string;
  priorityIds: string[];
  priorityBaseline: Record<string, string | null>;
  summary: {
    analyzedCells: number;
    humanPresenceReviewed: number;
    automaticProvisional: number;
    priorityCells: number;
    unreviewedOutsidePriority: number;
    legacyNegativesWithSignal: number;
    reviewedPositivesBelow03: number;
    signalCounts: Record<string, number>;
  };
};

export function priorityReviewed(review: CellReview | undefined, baseline: string | null | undefined) {
  return !!review && review.criterion === PRESENCE_CRITERION && review.updatedAt !== baseline;
}
