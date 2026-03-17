export const getScoreMeta = (score: number) => {
    const normalizedScore = Math.min(100, Math.max(0, score));
    if (normalizedScore >= 80) return { color: "score-green", label: "Well Protected" };
    if (normalizedScore >= 50) return { color: "score-amber", label: "Moderate Risk" };
    return { color: "score-red", label: "High Risk" };
};
