import { useCallback, useRef, useState } from "react";
import { TextAttributes, type InputRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useDialog } from "../../providers/dialog";
import { useToast } from "../../providers/toast";
import { useKeyboardLayer } from "../../providers/keyboard-layer";
import { useTheme } from "../../providers/theme";
import { getByokKey } from "@prismcode543/shared";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic (Claude)", needsKey: true },
  { id: "openai", label: "OpenAI (GPT)", needsKey: true },
  { id: "google", label: "Google (Gemini)", needsKey: true },
  { id: "groq", label: "Groq", needsKey: true },
  { id: "openrouter", label: "OpenRouter", needsKey: true },
  { id: "opencode", label: "OpenCode", needsKey: true },
  { id: "ollama", label: "Ollama (local)", needsKey: false },
];

const CWD = process.cwd();
const CONFIG_PATH = join(CWD, "prismcode.json");

function saveProviderKey(providerId: string, apiKey: string) {
  let config: Record<string, unknown> = {};
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    config = JSON.parse(raw);
  } catch {
    // file doesn't exist yet
  }
  const providers = (config.providers as Record<string, unknown>) ?? {};
  providers[providerId] = { apiKey };
  config.providers = providers;
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function ApiDialogContent() {
  const dialog = useDialog();
  const toast = useToast();
  const { isTopLayer } = useKeyboardLayer();
  const { colors } = useTheme();
  const inputRef = useRef<InputRenderable>(null);

  const [view, setView] = useState<"list" | "key">("list");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<typeof PROVIDERS[number] | null>(null);
  const [keyValue, setKeyValue] = useState("");
  const [keyChanged, setKeyChanged] = useState(false);

  const handleSelectProvider = useCallback((idx: number) => {
    const provider = PROVIDERS[idx];
    if (!provider) return;
    if (!provider.needsKey) {
      toast.show({ message: `${provider.label} doesn't need an API key` });
      return;
    }
    setSelectedProvider(provider);
    setKeyValue(getByokKey(provider.id) ?? "");
    setKeyChanged(false);
    setView("key");
  }, [toast]);

  const handleSaveKey = useCallback(() => {
    if (!selectedProvider) return;
    const value = inputRef.current?.value ?? "";
    const trimmed = value.trim();
    if (!trimmed) {
      toast.show({ variant: "error", message: "Enter an API key" });
      return;
    }
    saveProviderKey(selectedProvider.id, trimmed);
    process.env[`${selectedProvider.id.toUpperCase()}_API_KEY`] = trimmed;
    toast.show({ variant: "success", message: `${selectedProvider.label} key saved` });
    dialog.close();
  }, [selectedProvider, dialog, toast]);

  const handleBack = useCallback(() => {
    setView("list");
    setSelectedProvider(null);
    setKeyValue("");
  }, []);

  const handleKeyContentChange = useCallback(() => {
    setKeyValue(inputRef.current?.value ?? "");
    setKeyChanged(true);
  }, []);

  useKeyboard((key) => {
    if (!isTopLayer("dialog")) return;

    if (view === "key") {
      if (key.name === "escape") {
        key.preventDefault();
        handleBack();
      } else if (key.name === "return" || key.name === "enter") {
        key.preventDefault();
        handleSaveKey();
      }
      return;
    }

    if (key.name === "escape") {
      key.preventDefault();
      dialog.close();
    } else if (key.name === "up") {
      key.preventDefault();
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (key.name === "down") {
      key.preventDefault();
      setSelectedIdx((i) => Math.min(PROVIDERS.length - 1, i + 1));
    } else if (key.name === "return" || key.name === "enter") {
      key.preventDefault();
      handleSelectProvider(selectedIdx);
    }
  });

  if (view === "key" && selectedProvider) {
    return (
      <box flexDirection="column" gap={1} paddingX={1} paddingY={1}>
        <text selectable={false} attributes={TextAttributes.BOLD}>{selectedProvider.label}</text>
        <text selectable={false} dim>Enter your API key:</text>
        <input
          ref={inputRef}
          placeholder="sk-..."
          focused
          onContentChange={handleKeyContentChange}
        />
        <text selectable={false} attributes={TextAttributes.DIM}>
          Press Enter to save, Escape to go back (Shift+Insert to paste)
        </text>
      </box>
    );
  }

  return (
    <box flexDirection="column" gap={1} paddingX={1} paddingY={1}>
      <text selectable={false} attributes={TextAttributes.BOLD}>API Providers</text>
      <text selectable={false} dim>Select a provider to configure its API key:</text>
      {PROVIDERS.map((provider, i) => {
        const isSelected = i === selectedIdx;
        const hasKey = provider.needsKey ? !!getByokKey(provider.id) : true;
        return (
          <box
            key={provider.id}
            flexDirection="row"
            height={1}
            gap={1}
            backgroundColor={isSelected ? colors.selection : undefined}
            onMouseMove={() => setSelectedIdx(i)}
            onMouseDown={() => handleSelectProvider(i)}
          >
            <text selectable={false} fg={hasKey ? "green" : "gray"}>
              {hasKey ? "●" : "○"}
            </text>
            <text selectable={false} fg={isSelected ? "black" : "white"}>
              {provider.label}
            </text>
          </box>
        );
      })}
    </box>
  );
}
