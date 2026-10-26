// =============================================================================
// Diálogo de skills - PrismCode
// Gerencia skills instaladas: lista, ativa/desativa, instala novas.
// Permite instalar de caminho local ou URL.
// =============================================================================

import { useCallback, useMemo, useRef, useState } from "react";
import { useDialog } from "../../providers/dialog";
import { useToast } from "../../providers/toast";
import { useTheme } from "../../providers/theme";
import { useKeyboard } from "@opentui/react";
import { useKeyboardLayer } from "../../providers/keyboard-layer";
import { DialogSearchList } from "../dialog-search-list";
import { getInstalledSkills, toggleSkill, removeSkill, installSkill } from "../../lib/skills/skill-manager";
import type { SkillDefinition } from "@prismcode543/shared";
import { TextAttributes, type InputRenderable } from "@opentui/core";

export const SkillsDialogContent = ({ onSkillChanged }: { onSkillChanged?: () => void }) => {
  const dialog = useDialog();
  const toast = useToast();
  const { colors } = useTheme();
  const { isTopLayer } = useKeyboardLayer();

  // Estado: lista ou instalação
  const [view, setView] = useState<"list" | "install">("list");
  const [installValue, setInstallValue] = useState("");
  const [installCount, setInstallCount] = useState(0); // Força re-render
  const installInputRef = useRef<InputRenderable>(null);

  // Lista de skills instaladas (recalcula quando installCount muda)
  const skills = useMemo(() => getInstalledSkills(), [installCount]);

  // Ativa/desativa uma skill
  const handleToggle = useCallback(
    (skill: SkillDefinition) => {
      toggleSkill(skill.manifest.name, !skill.manifest.enabled);
      onSkillChanged?.();
    },
    [onSkillChanged],
  );

  // Remove uma skill
  const handleRemove = useCallback(
    (skill: SkillDefinition) => {
      removeSkill(skill.manifest.name);
      onSkillChanged?.();
    },
    [onSkillChanged],
  );

  // Instala uma nova skill
  const handleInstallSubmit = useCallback(async () => {
    const source = installValue.trim();
    if (!source) return;
    try {
      await installSkill(source);
      setInstallCount((c) => c + 1); // Atualiza lista
      setView("list");
      setInstallValue("");
      onSkillChanged?.();
      toast.show({ variant: "success", message: `Skill installed from: ${source}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Install failed";
      toast.show({ variant: "error", message });
    }
  }, [installValue, onSkillChanged, toast]);

  const handleInstallContentChange = useCallback(() => {
    setInstallValue(installInputRef.current?.value ?? "");
  }, []);

  // Atalhos de teclado: I para instalar, ESC para voltar
  useKeyboard((key) => {
    if (!isTopLayer("dialog")) return;
    if (view === "list" && (key.name === "i" || key.name === "I")) {
      key.preventDefault();
      setView("install");
      setInstallValue("");
    }
    if (view === "install") {
      if (key.name === "escape") { key.preventDefault(); setView("list"); setInstallValue(""); }
      if (key.name === "return" || key.name === "enter") { key.preventDefault(); void handleInstallSubmit(); }
    }
  });

  // Tela de instalação
  if (view === "install") {
    return (
      <box flexDirection="column" gap={1} paddingX={1} paddingY={1}>
        <text attributes={TextAttributes.BOLD} selectable={false}>Install a Skill</text>
        <text selectable={false}>Enter a local path or URL to the skill directory:</text>
        <input ref={installInputRef} focused placeholder="C:\path\to\skill or https://..." onContentChange={handleInstallContentChange} />
        <text selectable={false} attributes={TextAttributes.DIM}>Press Enter to install, Escape to cancel</text>
      </box>
    );
  }

  // Tela de lista
  return (
    <box flexDirection="column" gap={1} paddingX={1} paddingY={1}>
      <box flexDirection="row" gap={1} paddingBottom={1}>
        <text attributes={TextAttributes.BOLD} selectable={false}>
          Installed Skills ({skills.length})
        </text>
        <text attributes={TextAttributes.DIM} selectable={false}> — press I to install</text>
      </box>
      {skills.length === 0 ? (
        <text selectable={false}>No skills installed. Press I to install one.</text>
      ) : (
        <DialogSearchList
          items={skills}
          onSelect={(skill) => handleToggle(skill)}
          filterFn={(item, query) =>
            item.manifest.displayName.toLowerCase().includes(query.toLowerCase()) ||
            item.manifest.name.toLowerCase().includes(query.toLowerCase()) ||
            item.manifest.description.toLowerCase().includes(query.toLowerCase())
          }
          renderItem={(item, isSelected) => (
            <box flexDirection="row" gap={1}>
              <text selectable={false} fg={isSelected ? "black" : "white"}>
                {item.manifest.enabled ? "●" : "○"}
              </text>
              <text selectable={false} fg={isSelected ? "black" : "white"}>
                {item.manifest.displayName}
              </text>
              <text selectable={false} attributes={!item.manifest.enabled ? TextAttributes.DIM : undefined}>
                v{item.manifest.version}
              </text>
            </box>
          )}
          getKey={(item) => item.manifest.name}
          placeholder="Search skills"
          emptyText="No matching skills"
        />
      )}
    </box>
  );
};
