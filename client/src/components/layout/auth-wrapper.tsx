import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, LogIn } from "lucide-react";

interface AuthWrapperProps {
  children: React.ReactNode;
  showLoginPrompt?: boolean;
}

export function AuthWrapper({ children, showLoginPrompt = true }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && showLoginPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center">
              <LogIn className="w-6 h-6 mr-2" />
              Login Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-slate-600">
              Please log in to access the risk intelligence platform.
            </p>
            <div className="flex flex-col space-y-2">
              <Button onClick={login} className="w-full">
                Login with Replit
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Always render children, even if not authenticated (for preview mode)
  return <>{children}</>;
}