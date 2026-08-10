import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { PromptBusProvider } from "@/lib/PromptBus";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import Docs from "./pages/Docs";
import Generate from "./pages/GeneratePrivate";
import GenerateImage from "./pages/GenerateImagePrivate";
import Gallery from "./pages/Gallery";
import Layout from "./components/Layout";

const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
  </div>
);

const GoogleAuthRedirect = ({ navigateToLogin }) => {
  useEffect(() => {
    navigateToLogin();
  }, [navigateToLogin]);

  return <LoadingScreen />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) return <LoadingScreen />;

  if (authError?.type === "user_not_registered") return <UserNotRegisteredError />;
  if (authError?.type === "auth_required") return <GoogleAuthRedirect navigateToLogin={navigateToLogin} />;
  if (authError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border border-destructive/30 bg-card p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">UnitySora could not load</h1>
          <p className="mt-2 text-sm text-muted-foreground">{authError.message}</p>
          <button className="mt-5 text-sm font-medium text-primary underline" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Nothing in the app renders without a signed-in Google account. The
  // entity row level security is the real boundary; this keeps the UI from
  // ever mounting in a signed-out state and firing unscoped reads.
  if (!isAuthenticated) return <SignIn />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/generate-image" element={<GenerateImage />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/image-gallery" element={<Gallery />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <PromptBusProvider>
            <AuthenticatedApp />
          </PromptBusProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
