import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type PropsWithChildren,
} from "react";

import { subscribeSocketLifecycle } from "@/socket/client";
import { setSocketConnected, setSocketReconnecting } from "@/state/appActions";

import {
  appReducer,
  initialAppState,
  type AppAction,
  type AppState,
} from "./appReducer";

interface AppStateContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(
  undefined,
);

function SocketStateBridge() {
  const { dispatch } = useAppState();

  useEffect(() => {
    const unsubscribe = subscribeSocketLifecycle((connected, reconnecting) => {
      dispatch(setSocketConnected(connected));
      dispatch(setSocketReconnecting(reconnecting));
    });

    return unsubscribe;
  }, [dispatch]);

  return null;
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      <SocketStateBridge />
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }

  return context;
}

export function useAppStateDispatch() {
  const { dispatch } = useAppState();
  return dispatch;
}
