/**
 * Split an FAQ answer into renderable text and allowlisted citation markers.
 * @param {string} answer
 * @param {boolean} citationLinks
 * @param {number[]} citationSourceIds
 * @returns {(string|number)[]}
 */
export function splitFaqAnswer(answer, citationLinks, citationSourceIds = []) {
  if (!citationLinks) return [answer];

  const validCitationIds = new Set(citationSourceIds);
  return answer.split(/(\[\d+\])/g).filter(Boolean).map((part) => {
    const match = part.match(/^\[(\d+)\]$/);
    const citationId = match ? Number(match[1]) : null;
    return citationId !== null && validCitationIds.has(citationId) ? citationId : part;
  });
}
