import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider
} from "@/components/ui/sidebar";
import { 
  Activity, 
  Box, 
  CheckCircle, 
  Command, 
  Cpu, 
  FileCode, 
  Github, 
  LayoutDashboard, 
  ListTodo, 
  Network, 
  Settings,
  Zap,
  AlertTriangle,
  Moon,
  Sun
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { useGetOverviewSummary, useGetSettings } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export function SidebarLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  const { data: summary } = useGetOverviewSummary({
    query: { queryKey: ["overview-summary"], retry: false, refetchInterval: 30000 },
  });
  const { data: settings } = useGetSettings({
    query: { queryKey: ["settings"], retry: false, staleTime: 300000 },
  });

  const pendingApprovals = (summary as { pendingApprovals?: number } | undefined)?.pendingApprovals ?? 0;
  const adaptersHealthy = (summary as { adaptersHealthy?: number } | undefined)?.adaptersHealthy;
  const adaptersTotal = (summary as { adaptersTotal?: number } | undefined)?.adaptersTotal;
  const adaptersDegraded = (summary as { adaptersDegraded?: number } | undefined)?.adaptersDegraded ?? 0;
  const version = (settings as { version?: string } | undefined)?.version ?? "0.23.0";
  const isHealthy = adaptersDegraded === 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-sidebar-border">
          <SidebarHeader className="p-4 flex flex-row items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
              Ω
            </div>
            <span className="font-bold text-lg tracking-tight">OmegaBot</span>
          </SidebarHeader>
          <SidebarContent>
            
            <SidebarGroup>
              <SidebarGroupLabel>Platform</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/"}>
                      <Link href="/">
                        <Activity className="h-4 w-4" />
                        <span>Start Here</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/overview"}>
                      <Link href="/overview">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Overview</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Runtime</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/tasks")}>
                      <Link href="/tasks">
                        <ListTodo className="h-4 w-4" />
                        <span>Tasks & Runs</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/commands")}>
                      <Link href="/commands">
                        <Command className="h-4 w-4" />
                        <span>Commands</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/approvals")}>
                      <Link href="/approvals">
                        <CheckCircle className="h-4 w-4" />
                        <span>Approvals</span>
                        {pendingApprovals > 0 && (
                          <div className="ml-auto bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
                            {pendingApprovals}
                          </div>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/events")}>
                      <Link href="/events">
                        <Zap className="h-4 w-4" />
                        <span>Events</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Infrastructure</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/adapters")}>
                      <Link href="/adapters">
                        <Network className="h-4 w-4" />
                        <span>Adapters</span>
                        {adaptersDegraded > 0 && (
                          <div className="ml-auto">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          </div>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/llm")}>
                      <Link href="/llm">
                        <Cpu className="h-4 w-4" />
                        <span>LLM Routing</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/integrations")}>
                      <Link href="/integrations">
                        <Box className="h-4 w-4" />
                        <span>Integrations</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Developer</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/github")}>
                      <Link href="/github">
                        <Github className="h-4 w-4" />
                        <span>GitHub</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/artifacts")}>
                      <Link href="/artifacts">
                        <FileCode className="h-4 w-4" />
                        <span>Artifacts</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/settings")}>
                      <Link href="/settings">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

          </SidebarContent>
          <SidebarFooter className="p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className={cn("flex items-center gap-1.5", isHealthy ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                  <div className={cn("w-2 h-2 rounded-full", isHealthy ? "bg-green-500" : "bg-amber-500")}></div>
                  {isHealthy
                    ? "System Healthy"
                    : `${adaptersDegraded} adapter${adaptersDegraded > 1 ? "s" : ""} degraded`}
                  {adaptersTotal !== undefined && adaptersHealthy !== undefined && (
                    <span className="text-muted-foreground ml-0.5">({adaptersHealthy}/{adaptersTotal})</span>
                  )}
                </span>
                <span className="font-mono">v{version}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full text-xs h-8 gap-2"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
