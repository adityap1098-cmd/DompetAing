import { NavLink, useLocation } from "react-router-dom";
import { useGlobalAddStore } from "@/store/globalAdd";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function TxnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function BudgetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[18px] h-[18px]">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="21.17" y1="8" x2="12" y2="8" />
      <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const navItems = [
  { to: "/dashboard", icon: HomeIcon, label: "Beranda" },
  { to: "/transactions", icon: TxnIcon, label: "Transaksi" },
  { to: "/budget", icon: BudgetIcon, label: "Budget" },
  { to: "/settings", icon: ProfileIcon, label: "Akun" },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const openGlobal = useGlobalAddStore((s) => s.open);

  // Context-aware: determine which form to open based on current page
  function handleAdd() {
    if (pathname.startsWith("/budget")) {
      openGlobal("budget");
    } else if (pathname.startsWith("/debts")) {
      openGlobal("debt");
    } else {
      // Default: transaction (for /dashboard, /transactions, and all other pages)
      openGlobal("transaction");
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[rgba(255,255,255,0.94)] dark:bg-[rgba(13,14,11,0.96)] backdrop-blur-xl border-t border-[rgba(0,0,0,0.07)] dark:border-[rgba(255,255,255,0.07)]">
      <div className="max-w-md mx-auto flex items-end justify-around px-0.5 pb-[env(safe-area-inset-bottom)] min-h-[66px]">
        {/* First 2 items */}
        {navItems.slice(0, 2).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "flex flex-col items-center gap-[3px] text-[9px] font-semibold py-1 px-2 cursor-pointer",
                isActive
                  ? "text-accent-500 dark:text-accent-dark"
                  : "text-[#9E9B98] dark:text-[#4A4948]",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <item.icon />
                <span className={isActive ? "font-bold" : ""}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Center FAB — context-aware */}
        <div className="flex flex-col items-center gap-[3px] pb-1">
          <button
            onClick={handleAdd}
            className="w-[46px] h-[46px] bg-accent-500 dark:bg-accent-dark rounded-full flex items-center justify-center -mt-[18px] shadow-[0_4px_14px_rgba(46,125,90,0.38)] active:scale-95 transition-transform"
            aria-label="Tambah"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" className="w-5 h-5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Last 2 items */}
        {navItems.slice(2).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "flex flex-col items-center gap-[3px] text-[9px] font-semibold py-1 px-2 cursor-pointer",
                isActive
                  ? "text-accent-500 dark:text-accent-dark"
                  : "text-[#9E9B98] dark:text-[#4A4948]",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <item.icon />
                <span className={isActive ? "font-bold" : ""}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
