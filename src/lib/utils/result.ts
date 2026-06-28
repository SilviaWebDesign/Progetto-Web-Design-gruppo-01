import type { Section, OpinionState } from '$lib/types';

/**
 * Computes the overall opinion result for a section from its likes.
 * Counts liked comments by sentiment across all topics, then maps the
 * tally to one of the five opinion states.
 */
export function computeOpinionState(
  section: Section,
  topicLikes: Record<string, boolean>[]
): OpinionState {
  let positive = 0;
  let negative = 0;

  section.topics.forEach((topic, i) => {
    for (const comment of topic.comments) {
      if (!topicLikes[i][comment.id]) continue;
      if (comment.sentiment === 'positive') positive += 1;
      else negative += 1;
    }
  });

  if (positive > 0 && negative === 0) return 'ALL_POSITIVE';
  if (negative > 0 && positive === 0) return 'ALL_NEGATIVE';
  if (positive > negative)            return 'MOSTLY_POSITIVE';
  if (negative > positive)            return 'MOSTLY_NEGATIVE';
  return 'NEUTRAL';
}