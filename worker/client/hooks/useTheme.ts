import { useState, useEffect } from "react";

type Theme = "light" | "dark";

const THEME_VARS = {
  light: {
    "--bg-color": "rgb(241, 242, 246)",
    "--box-color": "white",
    "--font-color": "black",
    "--load": "rgba(211, 211, 211, 0.6)",
  },
  dark: {
    "--bg-color": "rgb(33, 37, 43)",
    "--box-color": "rgb(40, 44, 52)",
    "--font-color": "white",
    "--load": "rgba(0, 0, 0, 0.6)",
  },
};

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const vars = THEME_VARS[theme];
  Object.entries(vars).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("heng-theme") as Theme) || "light";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("heng-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return { theme, toggleTheme };
}
