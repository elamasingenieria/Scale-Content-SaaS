import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppShell from "./components/layout/AppShell";
import Videos from "./pages/Videos";
import VideoDetail from "./pages/VideoDetail";
import Branding from "./pages/Branding";
import Billing from "./pages/Billing";
import Login from "./pages/Login";

import RequireAuth from "@/components/auth/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
            <Route path="/login" element={<Login />} />
            <Route path="/videos" element={<RequireAuth><Videos /></RequireAuth>} />
            <Route path="/videos/:id" element={<RequireAuth><VideoDetail /></RequireAuth>} />
            <Route path="/branding" element={<RequireAuth><Branding /></RequireAuth>} />
            <Route path="/billing" element={<RequireAuth><Billing /></RequireAuth>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
