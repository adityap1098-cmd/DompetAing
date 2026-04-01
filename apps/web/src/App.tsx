import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Suspense, useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/Login";
import { OnboardingPage } from "@/pages/Onboarding";
import { DashboardPage } from "@/pages/Dashboard";
import { AccountsPage } from "@/pages/Accounts";
import { AccountDetailPage } from "@/pages/AccountDetail";
import { TransactionsPage } from "@/pages/Transactions";
import { TransactionDetailPage } from "@/pages/TransactionDetail";
import { BudgetPage } from "@/pages/Budget";
import { DebtsPage } from "@/pages/Debts";
import { RecurringPage } from "@/pages/Recurring";
import { ReportsPage } from "@/pages/Reports";
import { ExportPage } from "@/pages/Export";
import { SettingsPage } from "@/pages/Settings";
import { SubscriptionPage } from "@/pages/Subscription";
import { CategoriesPage } from "@/pages/Categories";
import { GmailSyncPage } from "@/pages/GmailSync";
import { NotificationsPage } from "@/pages/Notifications";
import { ImportPage } from "@/pages/Import";
import { PaymentSuccessPage } from "@/pages/PaymentSuccess";
import { AdminPage } from "@/pages/Admin";
import { PrivacyPolicyPage } from "@/pages/PrivacyPolicy";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useSecurityAction } from "@/hooks/useSettings";
import { DashboardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ApiError } from "@/lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});

// ── PIN Lock Screen ──
const PIN_SESSION_KEY = "da_pin_unlocked";

function PinLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const { mutate, isPending } = useSecurityAction();

  function handleVerify() {
    if (!/^\d{4,6}$/.test(pin)) {
      setError("Masukkan PIN 4-6 digit");
      return;
    }
    mutate(
      { action: "verify_pin", pin },
      {
        onSuccess: () => {
          sessionStorage.setItem(PIN_SESSION_KEY, "1");
          onUnlock();
        },
        onError: () => {
          setError("PIN salah, coba lagi");
          setPin("");
        },
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F7F6F3] dark:bg-[#111210] px-8">
      <div className="text-4xl mb-6">🔒</div>
      <h2 className="text-[20px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-1">
        Masukkan PIN
      </h2>
      <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96] mb-8 text-center">
        Masukkan PIN untuk membuka DompetAing
      </p>
      <input
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={pin}
        onChange={(e) => {
          setPin(e.target.value.replace(/\D/g, ""));
          setError("");
        }}
        onKeyDown={(e) => e.key === "Enter" && handleVerify()}
        autoFocus
        placeholder="••••"
        className="w-48 text-center text-2xl tracking-[0.5em] px-4 py-3 border-2 border-[rgba(0,0,0,0.12)] dark:border-[rgba(255,255,255,0.1)] rounded-[14px] bg-white dark:bg-[#1C1D1A] text-[#1A1917] dark:text-[#F0EEE9] focus:border-accent-500 dark:focus:border-accent-dark outline-none mb-2"
      />
      {error && (
        <p className="text-[12px] text-[#C94A1C] dark:text-[#E87340] mb-4">{error}</p>
      )}
      <button
        onClick={handleVerify}
        disabled={isPending || pin.length < 4}
        className="mt-4 px-8 py-3 bg-accent-500 dark:bg-accent-dark text-white rounded-[12px] text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Memeriksa..." : "Buka"}
      </button>
    </div>
  );
}

// ── Protected Route Guard ──
function ProtectedLayout() {
  const { isLoading, isAuthenticated, isUnauthenticated, user } = useAuth();
  useColorScheme();

  const [pinUnlocked, setPinUnlocked] = useState(
    () => sessionStorage.getItem(PIN_SESSION_KEY) === "1"
  );

  // When user data loads, check if PIN lock should show
  const pinRequired = !isLoading && isAuthenticated && (user as (typeof user & { pin_set?: boolean }))?.pin_set && !pinUnlocked;

  useEffect(() => {
    // If user just loaded and pin is not set, ensure no stale lock state
    if (user && !(user as typeof user & { pin_set?: boolean }).pin_set) {
      sessionStorage.removeItem(PIN_SESSION_KEY);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F7F6F3] dark:bg-[#111210]">
        <div className="animate-spin h-8 w-8 border-2 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isUnauthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (pinRequired) {
    return <PinLockScreen onUnlock={() => setPinUnlocked(true)} />;
  }

  return (
    <AppShell>
      <Suspense fallback={<DashboardSkeleton />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<Navigate to="/privacy" replace />} />

      {/* Protected routes */}
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/transactions/:id" element={<TransactionDetailPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/accounts/:id" element={<AccountDetailPage />} />
        {/* Placeholder routes for future milestones */}
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/recurring" element={<RecurringPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/gmail-sync" element={<GmailSyncPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function PlaceholderPage({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
      <span className="text-5xl mb-4">{icon}</span>
      <h2 className="text-[16px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-2">{title}</h2>
      <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96]">Coming soon di milestone berikutnya</p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
