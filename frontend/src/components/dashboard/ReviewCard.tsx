import { ReviewScore, ReviewType } from "@/types/insurance";
import { getScoreColor, getScoreLabel, getScoreBgColor } from "@/data/mockScores";
import { AlertTriangle, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  type: ReviewType;
  score: ReviewScore;
}

const typeLabels: Record<ReviewType, string> = {
  health: "Health Insurance",
  motor: "Motor Insurance",
  term: "Term Insurance",
};

const typeIcons: Record<ReviewType, string> = {
  health: "🏥",
  motor: "🚗",
  term: "🛡️",
};

const ReviewCard = ({ type, score }: Props) => {
  const getIcon = (s: number) => {
    if (s >= 70) return <CheckCircle2 className="h-5 w-5 text-score-green" />;
    if (s >= 50) return <AlertTriangle className="h-5 w-5 text-score-amber" />;
    return <XCircle className="h-5 w-5 text-score-red" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl border border-border/50 bg-card p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeIcons[type]}</span>
          <h3 className="text-lg font-bold text-foreground">{typeLabels[type]} Review</h3>
        </div>
        <div className="flex items-center gap-2">
          {getIcon(score.overall)}
          <span className={`text-2xl font-extrabold ${getScoreColor(score.overall)}`}>
            {score.overall}
          </span>
          <span className="text-muted-foreground text-sm">/100</span>
        </div>
      </div>

      <div className={`h-2 w-full rounded-full bg-secondary overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score.overall}%` }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className={`h-full rounded-full ${getScoreBgColor(score.overall)}`}
        />
      </div>

      <div className="rounded-xl bg-secondary/40 p-4">
        <p className="text-sm font-medium text-foreground mb-1">Gap Summary</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{score.gapSummary}</p>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-score-amber" />
          Key Risks Identified
        </p>
        <ul className="space-y-2">
          {score.risks.map((risk, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-score-red mt-1.5 shrink-0" />
              {risk}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-score-green" />
          What To Improve
        </p>
        <ul className="space-y-2">
          {score.improvements.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-score-green mt-1.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
};

export default ReviewCard;
