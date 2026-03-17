import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectionCheckProvider } from "@/context/ProtectionCheckContext";
import { MotorProtectionProvider } from "@/context/MotorProtectionCheckContext";
import { TermProtectionProvider } from "@/context/TermProtectionCheckContext";
import Index from "./pages/Index";
import ReviewForm from "./pages/ReviewForm";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

import { ThemeProvider } from "@/components/ThemeProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" attribute="class">
      <TooltipProvider>
        <ProtectionCheckProvider>
          <MotorProtectionProvider>
            <TermProtectionProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/review/:type" element={<ReviewForm />} />
                  <Route path="/dashboard/:type" element={<Dashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TermProtectionProvider>
          </MotorProtectionProvider>
        </ProtectionCheckProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
