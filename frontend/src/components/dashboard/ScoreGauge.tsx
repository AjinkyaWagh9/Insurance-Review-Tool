import { useEffect, useState } from "react";
import { getScoreStrokeColor, getScoreLabel, getScoreColor } from "@/data/mockScores";
import { getScoreMeta } from "@/utils/scoreMeta";

interface Props {
  score: number;
  size?: number;
}

const ScoreGauge = ({ score, size = 200 }: Props) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    let frame: number;
    const duration = 1500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="8"
        />
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          className={getScoreStrokeColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-5xl font-extrabold ${getScoreColor(score)}`}>
          {animatedScore}
        </span>
        <span className="text-muted-foreground text-sm font-medium mt-1">out of 100</span>
      </div>
      <span className={`text-sm font-semibold px-3 py-1 rounded-full bg-${getScoreMeta(score).color}/10 text-${getScoreMeta(score).color}`}>
        {getScoreLabel(score)}
      </span>
    </div>
  );
};

export default ScoreGauge;
