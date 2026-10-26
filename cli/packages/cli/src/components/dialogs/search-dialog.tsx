// =============================================================================
// Diálogo de busca de conversas - PrismCode
// Busca conteúdo nas mensagens de sessões anteriores.
// Mostra resultados com preview do contexto encontrado.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { TextAttributes, type InputRenderable, type ScrollBoxRenderable } from "@opentui/core";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import { useKeyboard } from "@opentui/react";
import { useDialog } from "../../providers/dialog";
import { useKeyboardLayer } from "../../providers/keyboard-layer";
import { useTheme } from "../../providers/theme";
import { apiClient } from "../../lib/api-client";
import { getErrorMessage } from "../../lib/http-errors";
import { useToast } from "../../providers/toast";

const MAX_VISIBLE_ITEMS = 8;

// Resultado de busca em uma sessão
type SearchHitSession = {
  sessionId: string;
  sessionTitle: string;
  createdAt: string;
  matchCount: number;
  matches: { role: string; preview: string }[];
};

export const SearchDialogContent = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHitSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<InputRenderable>(null);
  const scrollRef = useRef<ScrollBoxRenderable>(null);
  const { close } = useDialog();
  const navigate = useNavigate();
  const { show } = useToast();
  const { isTopLayer } = useKeyboardLayer();
  const { colors } = useTheme();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Executa a busca com debounce
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await apiClient.sessions.search.$get({ query: { q: q.trim() } });
      if (!res.ok) throw new Error(await getErrorMessage(res));
      const data = await res.json();
      setResults(data);
      setSelectedIndex(0);
    } catch (error) {
      show({ variant: "error", message: error instanceof Error ? error.message : "Search failed" });
    } finally { setLoading(false); }
  }, [show]);

  // Debounce na digitação
  const handleInputChange = useCallback(() => {
    const text = inputRef.current?.value ?? "";
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 300);
  }, [doSearch]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Navega para a sessão encontrada
  const handleSelect = useCallback((hit: SearchHitSession) => {
    close(); navigate(`/sessions/${hit.sessionId}`);
  }, [close, navigate]);

  const visibleHeight = Math.min(results.length, MAX_VISIBLE_ITEMS);

  // Navegação por teclado
  useKeyboard((key) => {
    if (!isTopLayer("dialog")) return;
    if (key.name === "return" || key.name === "enter") {
      const item = results[selectedIndex];
      if (item) handleSelect(item);
    } else if (key.name === "up") {
      key.preventDefault();
      setSelectedIndex((i) => {
        const newIndex = Math.max(0, i - 1);
        const sb = scrollRef.current;
        if (sb && newIndex < sb.scrollTop) sb.scrollTo(newIndex);
        return newIndex;
      });
    } else if (key.name === "down") {
      key.preventDefault();
      setSelectedIndex((i) => {
        const newIndex = Math.min(results.length - 1, i + 1);
        const sb = scrollRef.current;
        if (sb) {
          const viewportHeight = sb.viewport.height;
          const visibleEnd = sb.scrollTop + viewportHeight - 1;
          if (newIndex > visibleEnd) sb.scrollTo(newIndex - viewportHeight + 1);
        }
        return newIndex;
      });
    }
  });

  return (
    <box flexDirection="column" gap={1}>
      <input ref={inputRef} placeholder="Search past conversations..." focused onContentChange={handleInputChange} />
      {loading ? (
        <text attributes={TextAttributes.DIM}>Searching...</text>
      ) : query.trim() && results.length === 0 ? (
        <text attributes={TextAttributes.DIM}>No results found</text>
      ) : visibleHeight > 0 ? (
        <scrollbox ref={scrollRef} height={visibleHeight}>
          {results.map((hit, i) => {
            const isSelected = i === selectedIndex;
            return (
              <box key={hit.sessionId} flexDirection="column"
                backgroundColor={isSelected ? colors.selection : undefined}
                onMouseMove={() => setSelectedIndex(i)}
                onMouseDown={() => handleSelect(hit)}>
                <box flexDirection="row" height={1} overflow="hidden" paddingX={1}>
                  <text selectable={false} fg={isSelected ? "black" : "white"} attributes={TextAttributes.BOLD}>
                    {hit.sessionTitle}
                  </text>
                  <box flexGrow={1} />
                  <text selectable={false} fg={isSelected ? "black" : undefined} attributes={TextAttributes.DIM}>
                    {format(new Date(hit.createdAt), "MMM d, hh:mm a")}
                  </text>
                </box>
                {hit.matches.slice(0, 1).map((m, j) => (
                  <box key={j} paddingX={1} height={1} overflow="hidden">
                    <text attributes={TextAttributes.DIM} fg={isSelected ? "black" : undefined}>
                      {m.preview}
                    </text>
                  </box>
                ))}
              </box>
            );
          })}
        </scrollbox>
      ) : null}
    </box>
  );
};