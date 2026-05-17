import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  resolved: ResolvedTheme;
  setTheme: (t: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "happyrider:theme";

// theme-color values
const LIGHT_COLOR = "#ffffff";
const DARK_COLOR = "#0a0a0a";

function getSystem(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;

  // Update theme-color meta dynamically (remove media-scoped ones)
  const metas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  metas.forEach((m) => m.parentElement?.removeChild(m));
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = resolved === "dark" ? DARK_COLOR : LIGHT_COLOR;
  document.head.appendChild(meta);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (
      (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "system"
    );
  });
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    theme === "system" ? getSystem() : (theme as ResolvedTheme),
  );

  useEffect(() => {
    const r: ResolvedTheme =
      theme === "system" ? getSystem() : (theme as ResolvedTheme);
    setResolved(r);
    applyTheme(r);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const r = getSystem();
      setResolved(r);
      applyTheme(r);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
