import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

function applyTheme(pref: ThemePreference) {
  const isDark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(
    (localStorage.getItem("huddle_theme") as ThemePreference) ?? "system",
  );

  useEffect(() => {
    applyTheme(theme);

    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  function setTheme(pref: ThemePreference) {
    localStorage.setItem("huddle_theme", pref);
    setThemeState(pref);
  }

  return { theme, setTheme };
}