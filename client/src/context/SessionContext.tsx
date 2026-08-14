import {
  createContext,
  useContext,
  useState,
  useCallback,
  type PropsWithChildren,
} from "react";

interface SessionData {
  roomCode: string | null;
  lastTeam: "red" | "blue" | null;
  lastRole: "operative" | "spymaster" | null;
  lastJoinedAt: string | null;
}

interface SessionContextValue {
  session: SessionData;
  updateSession: (data: Partial<SessionData>) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

function loadSessionFromStorage(): SessionData {
  try {
    const stored = window.localStorage.getItem("codenames.session");
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<SessionData>;
      return {
        roomCode: parsed.roomCode ?? null,
        lastTeam: parsed.lastTeam ?? null,
        lastRole: parsed.lastRole ?? null,
        lastJoinedAt: parsed.lastJoinedAt ?? null,
      };
    }
  } catch {
    // ignore parse errors
  }

  return {
    roomCode: null,
    lastTeam: null,
    lastRole: null,
    lastJoinedAt: null,
  };
}

function saveSessionToStorage(data: SessionData): void {
  try {
    window.localStorage.setItem("codenames.session", JSON.stringify(data));
  } catch {
    // ignore storage quota errors in restricted contexts
  }
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionData>(loadSessionFromStorage);

  const updateSession = useCallback((data: Partial<SessionData>) => {
    setSession((current) => {
      const updated = { ...current, ...data };
      saveSessionToStorage(updated);
      return updated;
    });
  }, []);

  const clearSession = useCallback(() => {
    const cleared = {
      roomCode: null,
      lastTeam: null,
      lastRole: null,
      lastJoinedAt: null,
    };
    setSession(cleared);
    saveSessionToStorage(cleared);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        updateSession,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
}
