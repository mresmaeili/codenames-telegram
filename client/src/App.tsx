import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/layouts/AppLayout";
import { HomePage } from "@/pages/Home";

export default function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <HomePage />
      </AppLayout>
    </AuthProvider>
  );
}
