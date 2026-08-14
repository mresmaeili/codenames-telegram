import { AuthProvider } from "@/context/AuthContext";
import { SessionProvider } from "@/context/SessionContext";
import { AppLayout } from "@/layouts/AppLayout";
import { HomePage } from "@/pages/Home";
import { ToastProvider } from "@/context/ToastContext";

export default function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <ToastProvider>
          <AppLayout>
            <HomePage />
          </AppLayout>
        </ToastProvider>
      </SessionProvider>
    </AuthProvider>
  );
}
