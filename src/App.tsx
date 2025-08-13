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
import Admin from "./pages/Admin";



import RequireAuth from "@/components/auth/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><AppShell><Index /></AppShell></RequireAuth>} />
          <Route path="/videos" element={<RequireAuth><AppShell><Videos /></AppShell></RequireAuth>} />
          <Route path="/videos/:id" element={<RequireAuth><AppShell><VideoDetail /></AppShell></RequireAuth>} />
          <Route path="/branding" element={<RequireAuth><AppShell><Branding /></AppShell></RequireAuth>} />
          <Route path="/billing" element={<RequireAuth><AppShell><Billing /></AppShell></RequireAuth>} />
          
          <Route path="/admin" element={<RequireAuth><AppShell><Admin /></AppShell></RequireAuth>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
