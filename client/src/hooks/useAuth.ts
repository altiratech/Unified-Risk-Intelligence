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
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors (unauthorized)
      if (error?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Prevent constant auth checks
    refetchOnMount: true,
  });

  const login = () => {
    // Use replace instead of href to avoid popup blockers
    window.location.replace("/api/login");
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
  };
}
