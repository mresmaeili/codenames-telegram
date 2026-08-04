import { createContext, useContext, type PropsWithChildren } from "react";

import { useAuth } from "@/hooks/useAuth";

interface AuthenticatedUser {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  languageCode: string | null;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const authState = useAuth();

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
}
