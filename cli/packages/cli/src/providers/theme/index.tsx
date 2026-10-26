// =============================================================================
// Provider de temas - PrismCode
// Gerencia o tema visual atual da interface.
// Salva a preferência do usuário em ~/.prismcode/preferences.json.
// =============================================================================

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { ThemeColors, Theme } from "../../theme";
import { DEFAULT_THEME, THEMES } from "../../theme";

// Caminho do arquivo de preferências
const CONFIG_DIR = join(homedir(), ".prismcode");
const THEME_PREFERENCES_PATH = join(CONFIG_DIR, "preferences.json");

// Tipo das preferências salvas
type ThemePreferences = {
  themeName: string;
};

// Carrega o tema salvo ou retorna o padrão
function getInitialTheme(): Theme {
  try {
    const preferences = JSON.parse(
      readFileSync(THEME_PREFERENCES_PATH, "utf8"),
    ) as Partial<ThemePreferences>;
    const savedTheme = THEMES.find((theme) => theme.name === preferences.themeName);
    return savedTheme ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

// Salva o tema no disco
function persistTheme(theme: Theme) {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(
      THEME_PREFERENCES_PATH,
      JSON.stringify({ themeName: theme.name } satisfies ThemePreferences, null, 2),
      "utf8",
    );
  } catch {
    // Ignora erros de escrita (tema ainda funciona na sessão)
  }
};

// Tipo do contexto de tema
type ThemeContextValue = {
  colors: ThemeColors;          // Cores do tema atual
  currentTheme: Theme;          // Tema completo
  setTheme: (theme: Theme) => void; // Troca o tema
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Hook para usar o tema
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within a ThemeProvider");
  return value;
}

// Provider que gerencia o estado do tema
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(getInitialTheme);

  // Troca o tema e salva no disco
  const setTheme = useCallback((theme: Theme) => {
    setCurrentTheme(theme);
    persistTheme(theme);
  }, []);

  return (
    <ThemeContext.Provider value={{ colors: currentTheme.colors, currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

