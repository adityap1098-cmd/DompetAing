import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
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
import { PinLockScreen } from "@/components/pin/PinLockScreen";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";
import { DashboardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ApiError } from "@/lib/api";
import { createIDBPersister } from "@/lib/offline/persister";
import { initNetworkListeners } from "@/lib/offline";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 1000 * 60 * 60 * 24, // 24h — keep cache for offline use
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false;
        // Don't retry when offline
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
      // When offline, don't refetch on window focus / reconnect — serve from cache
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

const persister = createIDBPersister();

// ── PIN Lock Screen ──
// Memory-only flag: resets on every page load/refresh → always locked on restart
let pinUnlockedThisSession = false;
// Track if we've confirmed pin_set from fresh API data this page load
let pinStatusConfirmed = false;

// ── Protected Route Guard ──
function ProtectedLayout() {
  const { isLoading, isAuthenticated, isUnauthenticated, user, isFetched } = useAuth();
  useColorScheme();

  const [pinUnlocked, setPinUnlocked] = useState(() => pinUnlockedThisSession);

  // Initialize offline network listeners
  useEffect(() => {
    initNetworkListeners();
  }, []);

  // Mark pin status as confirmed once we get fresh data from API
  // isFetched becomes true after queryFn runs (not just cache restore)
  useEffect(() => {
    if (isFetched && user) {
      pinStatusConfirmed = true;
    }
  }, [isFetched, user]);

  // PIN lock logic:
  // - When online: wait for fresh API data (pinStatusConfirmed) before showing lock
  // - When offline: use cached data immediately (can't verify with server)
  const hasFreshPinStatus = pinStatusConfirmed || !navigator.onLine;
  const pinRequired = !isLoading && isAuthenticated && hasFreshPinStatus && user?.pin_set === true && !pinUnlocked;

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
    return (
      <PinLockScreen
        onUnlock={() => {
          pinUnlockedThisSession = true;
          setPinUnlocked(true);
        }}
      />
    );
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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        buster: "", // no cache-busting — we want to keep cache across sessions
      }}
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  );
}
