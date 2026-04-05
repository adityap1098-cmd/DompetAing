/// <reference types="vitest/globals" />
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// ── Mock react-router-dom ──
const mockNavigate = vi.fn();
const mockLocation = { pathname: "/dashboard", search: "", hash: "", state: null, key: "default" };
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => ({}),
    NavLink: ({ children, to, className, ...rest }: any) => {
      const cn = typeof className === "function" ? className({ isActive: false }) : className;
      return <a href={to} className={cn} {...rest}>{typeof children === "function" ? children({ isActive: false }) : children}</a>;
    },
  };
});

// ── Mock TanStack Query hooks ──
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    // Let QueryClient and Provider work normally for wrapping
  };
});

// ── Mock fetch ──
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true, data: null }),
});

// ── Mock matchMedia ──
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ── Mock IntersectionObserver ──
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// ── Mock sessionStorage ──
const store: Record<string, string> = {};
Object.defineProperty(window, "sessionStorage", {
  value: {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  },
});

// ── Mock navigator.onLine ──
Object.defineProperty(navigator, "onLine", { value: true, writable: true });

// ── Export mocks for test access ──
export { mockNavigate, mockLocation };
