import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, Link } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

import { AppLayout } from "@/components/layout";
import { ThemeProvider } from "@/components/theme-provider";

import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import IocExtractorPage from "@/pages/ioc-extractor";
import LogAnalyzerPage from "@/pages/log-analyzer";
import IncidentReportPage from "@/pages/incident-report";
import DecoderPage from "@/pages/decoder";
import HistoryPage from "@/pages/history";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(180, 100%, 40%)",
    colorForeground: "hsl(0, 0%, 95%)",
    colorMutedForeground: "hsl(240, 5%, 60%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(240, 10%, 6%)",
    colorInput: "hsl(240, 10%, 20%)",
    colorInputForeground: "hsl(0, 0%, 95%)",
    colorNeutral: "hsl(240, 10%, 20%)",
    fontFamily: "'Space Grotesk', sans-serif",
    borderRadius: "0px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0f0f12] rounded-none w-[440px] max-w-full overflow-hidden border border-[#2e2e33]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#f2f2f2] font-mono",
    headerSubtitle: "text-[#919199] font-mono text-sm",
    socialButtonsBlockButtonText: "text-[#f2f2f2] font-mono",
    formFieldLabel: "text-[#f2f2f2] font-mono text-xs uppercase tracking-wider",
    footerActionLink: "text-[#00cccc] hover:text-[#00e6e6] font-mono",
    footerActionText: "text-[#919199] font-mono",
    dividerText: "text-[#919199] font-mono",
    identityPreviewEditButton: "text-[#00cccc]",
    formFieldSuccessText: "text-[#00cccc]",
    alertText: "text-[#ff4d4d]",
    logoBox: "mb-6",
    socialButtonsBlockButton: "border-[#2e2e33] hover:bg-[#1f1f24] rounded-none",
    formButtonPrimary: "bg-[#00cccc] text-[#0f0f12] hover:bg-[#00b3b3] rounded-none font-mono uppercase font-bold",
    formFieldInput: "bg-[#1f1f24] border-[#2e2e33] text-[#f2f2f2] rounded-none focus:border-[#00cccc] font-mono",
    footerAction: "mt-4",
    dividerLine: "bg-[#2e2e33]",
    alert: "bg-[#1f0000] border-[#ff4d4d] rounded-none",
    otpCodeFieldInput: "border-[#2e2e33] rounded-none focus:border-[#00cccc]",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 font-mono">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 font-mono">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>
          <Component />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "SYSTEM AUTHENTICATION",
            subtitle: "Enter credentials to access console",
          },
        },
        signUp: {
          start: {
            title: "INITIALIZE CLEARANCE",
            subtitle: "Request analyst access",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ThemeProvider defaultTheme="dark">
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            {/* Public tool: no sign-in required, extraction is 100% client-side */}
            <Route path="/ioc-extractor" component={() => <AppLayout><IocExtractorPage /></AppLayout>} />

            {/* Protected App Routes */}
            <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
            <Route path="/log-analyzer" component={() => <ProtectedRoute component={LogAnalyzerPage} />} />
            <Route path="/incident-report" component={() => <ProtectedRoute component={IncidentReportPage} />} />
            <Route path="/decoder" component={() => <ProtectedRoute component={DecoderPage} />} />
            <Route path="/history" component={() => <ProtectedRoute component={HistoryPage} />} />
            
            <Route>
              <div className="min-h-screen flex items-center justify-center font-mono text-muted-foreground flex-col gap-4 bg-background">
                <h1 className="text-4xl text-foreground font-bold">404</h1>
                <p>SECTOR NOT FOUND</p>
                <Link href="/" className="text-primary hover:underline mt-4">RETURN TO BASE</Link>
              </div>
            </Route>
          </Switch>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
