import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Car, Shield, ArrowRight, Users, FileCheck, Building2, TrendingUp, CheckCircle2 } from "lucide-react";
import { ReviewType } from "@/types/insurance";
import { ThemeToggle } from "@/components/ThemeToggle";


const reviewTypes = [
  {
    type: "health" as ReviewType,
    title: "Health Insurance",
    subtitle: "Your health plan might be leaving you 40% exposed",
    description: "",
    highlight: "Starting from ₹600/month · IRDAI-regulated plans only",
    icon: Heart,
    colSpan: "md:col-span-1",
    rowSpan: ""
  },
  {
    type: "term" as ReviewType,
    title: "Term Insurance",
    subtitle: "What happens to your family if you're not here tomorrow?",
    description: "",
    highlight: "Coverage ₹25L to ₹1Cr · Claim settlement ratio verified",
    icon: Shield,
    colSpan: "md:col-span-1 md:row-span-2",
    rowSpan: "h-full"
  },
  {
    type: "motor" as ReviewType,
    title: "Motor Insurance",
    subtitle: "Renewing without comparing? You're likely overpaying.",
    description: "",
    highlight: "Starting ₹2,094 · IIB-verified pricing",
    icon: Car,
    colSpan: "md:col-span-1",
    rowSpan: ""
  }];


const stats = [
  { value: "18 Lacs+", label: "Clients Insured", icon: Users },
  { value: "240K+", label: "Policies Reviewed", icon: FileCheck },
  { value: "300+", label: "Branches Nationwide", icon: Building2 },
  { value: "₹2096 Cr+", label: "Claims Processed", icon: TrendingUp }];


const badges = ["India's #1 Insurance Advisor", "Most Trusted Partner 2025", "IRDAI-registered", "1Cr+ Policies Reviewed"];

const Index = () => {
  const navigate = useNavigate();

  const handleSelect = (type: ReviewType) => {
    navigate(`/review/${type}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/0.05)_0%,transparent_70%)] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-md bg-background/80 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img alt="Bajaj Capital" className="h-10 w-auto" src="https://www.bajajcapitalinsurance.com/images/logo.png" />
          </div>
          <div className="flex items-center gap-4">
            <a
              href="tel:1800-212-123123"
              className="text-muted-foreground text-sm hover:text-foreground transition-colors hidden sm:block">
              📞 1800-212-123123
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-14 pb-10 md:pt-20 md:pb-14 relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-foreground leading-tight tracking-tight">
              Is Your Insurance Actually
              <br />
              Protecting You?
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mt-4 max-w-xl leading-relaxed">
              Most people discover gaps in their cover only after a claim. Review yours in 2 minutes — free, unbiased, no obligations.
            </p>
          </motion.div>

        </div>
      </section>

      {/* Review Type Cards */}
      <section className="container mx-auto px-6 pb-16 md:pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reviewTypes.map((item, index) =>
            <motion.button
              key={item.type}
              onClick={() => handleSelect(item.type)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 * (index + 1), ease: "easeOut" }}
              className="text-left group rounded-2xl glass-card glass-card-hover p-8 transition-all duration-300 flex flex-col justify-between">

              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                </div>
                <p className="text-sm">
                  <span className="text-accent font-semibold">{item.subtitle}</span>{" "}
                  <span className="text-muted-foreground">{item.description}</span>
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mt-4">
                  <CheckCircle2 className="h-4 w-4 text-score-green" />
                  {item.highlight}
                </div>
              </div>
              <div className="mt-6 h-10 w-10 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-colors">
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
              </div>
            </motion.button>
          )}
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-t border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) =>
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                className="text-center">

                <stat.icon className="h-6 w-6 text-accent mx-auto mb-2" />
                <p className="text-2xl md:text-3xl font-extrabold text-primary">{stat.value}</p>
                <p className="text-muted-foreground text-sm mt-1">{stat.label}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-xs">
          © 2026 Bajaj Capital Insurance Broking Ltd. All rights reserved.
        </div>
      </footer>
    </div>);

};

export default Index;