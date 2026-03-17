import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, Phone, RotateCcw } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import ScoreGauge from "@/components/dashboard/ScoreGauge";
import ReviewCard from "@/components/dashboard/ReviewCard";
import { ReviewType } from "@/types/insurance";
import { generateMockScore } from "@/data/mockScores";


const Dashboard = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const reviewType = type as ReviewType;

  const score = generateMockScore(
    ["health", "motor", "term"].includes(reviewType) ? reviewType : "health"
  );

  if (!["health", "motor", "term"].includes(reviewType)) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="https://www.bajajcapitalinsurance.com/images/logo.png" alt="Bajaj Capital" className="h-10 w-auto" />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-2">
              <RotateCcw className="h-3.5 w-3.5" /> New Review
            </Button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-6 pt-10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-muted-foreground text-sm font-medium mb-1">Your Insurance Health Score</p>
          <div className="relative inline-flex items-center justify-center my-6">
            <ScoreGauge score={score.overall} size={180} />
          </div>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            Based on your profile, here's where you are exposed. Review the detailed analysis below.
          </p>
        </motion.div>
      </section>

      <section className="container mx-auto px-6 pb-8 max-w-2xl">
        <ReviewCard type={reviewType} score={score} />
      </section>

      <section className="container mx-auto px-6 pb-16 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Button className="flex-1 h-12 gap-2 text-base font-semibold">
            <Download className="h-4 w-4" /> Download PDF Report
          </Button>
          <Button variant="outline" className="flex-1 h-12 gap-2 text-base font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <Phone className="h-4 w-4" /> Connect with Advisor
          </Button>
          <Button variant="secondary" className="flex-1 h-12 gap-2 text-base font-semibold" onClick={() => navigate("/")}>
            <RotateCcw className="h-4 w-4" /> Review Another Policy
          </Button>
        </motion.div>
      </section>
    </div>
  );
};

export default Dashboard;
