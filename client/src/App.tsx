import { AuthProvider } from "@/context/AuthContext";
import { SessionProvider } from "@/context/SessionContext";
import { AppLayout } from "@/layouts/AppLayout";
import { HomePage } from "@/pages/Home";
import { ToastProvider } from "@/context/ToastContext";
import { AppStateProvider } from "@/state/AppStateContext";

export default function App() {
  return (
    <AppStateProvider>
      <AuthProvider>
        <SessionProvider>
          <ToastProvider>
            <AppLayout>
              <HomePage />
            </AppLayout>
          </ToastProvider>
        </SessionProvider>
      </AuthProvider>
    </AppStateProvider>
  );
}
