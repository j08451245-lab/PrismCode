// =============================================================================
// Barra de status - PrismCode
// Exibe o modo atual (Plan/Build) e o modelo de IA selecionado.
// =============================================================================

import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import { usePromptConfig } from "../providers/prompt-config";
import { Mode } from "@prismcode543/shared";

export function StatusBar() {
  const { mode, model } = usePromptConfig();
  const { colors } = useTheme();

  return (
    <box flexDirection="row" gap={1}>
      {/* Indicador do modo: cor do modo planejamento ou primária */}
      <text fg={mode === Mode.PLAN ? colors.planMode : colors.primary}>
        {mode === Mode.PLAN ? "Plan" : "Build"}
      </text>
      <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>›</text>
      <text>{model}</text>
    </box>
  );
};

