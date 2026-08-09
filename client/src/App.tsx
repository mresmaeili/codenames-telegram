import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/layouts/AppLayout";
import { HomePage } from "@/pages/Home";
import { ToastProvider } from "@/context/ToastContext";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppLayout>
          <HomePage />
        </AppLayout>
      </ToastProvider>
    </AuthProvider>
  );
}
