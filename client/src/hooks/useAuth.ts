import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  name?: string;
  organizationId?: string;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: false, // Completely disable for preview mode
    retry: false, // Don't retry at all for preview mode
    staleTime: Infinity, // Don't refetch automatically
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Prevent constant auth checks
    refetchOnMount: false, // Don't refetch on mount for preview
    refetchInterval: false, // Disable automatic refetching
  });

  const login = () => {
    // Use replace instead of href to avoid popup blockers
    window.location.replace("/api/login");
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading: false, // Always return false for preview mode
    error,
    login,
  };
}
