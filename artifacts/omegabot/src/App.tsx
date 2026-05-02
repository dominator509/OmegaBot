import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import NotFound from "@/pages/not-found";
import StartHere from "@/pages/start-here";
import Overview from "@/pages/overview";
import Tasks from "@/pages/tasks";
import Commands from "@/pages/commands";
import Approvals from "@/pages/approvals";
import Events from "@/pages/events";
import Adapters from "@/pages/adapters";
import LlmRouting from "@/pages/llm";
import Integrations from "@/pages/integrations";
import GitHub from "@/pages/github";
import ArtifactsPage from "@/pages/artifacts-page";
import Settings from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function Router() {
  return (
    <SidebarLayout>
      <Switch>
        <Route path="/" component={StartHere} />
        <Route path="/overview" component={Overview} />
        <Route path="/tasks*" component={Tasks} />
        <Route path="/commands*" component={Commands} />
        <Route path="/approvals*" component={Approvals} />
        <Route path="/events" component={Events} />
        <Route path="/adapters*" component={Adapters} />
        <Route path="/llm" component={LlmRouting} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/github*" component={GitHub} />
        <Route path="/artifacts" component={ArtifactsPage} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </SidebarLayout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="omega-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
