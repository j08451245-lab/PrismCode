// =============================================================================
// Diálogo de seleção de agente - PrismCode
// Permite ao usuário trocar entre os modos BUILD e PLAN.
// =============================================================================

import { useCallback } from "react";
import { useDialog } from "../../providers/dialog";
import { DialogSearchList } from "../dialog-search-list";
import { Mode, type ModeType } from "@prismcode543/shared";

// Modos disponíveis
const AVAILABLE_MODES: ModeType[] = [Mode.BUILD, Mode.PLAN];

type AgentsDialogContentProps = {
  currentMode: ModeType;                // Modo atual (mostra indicador)
  onSelectMode: (mode: ModeType) => void; // Callback de seleção
};

// Retorna o nome legível do modo
function getModeLabel(mode: ModeType) {
  return mode === Mode.PLAN ? "Plan" : "Build";
}

export const AgentsDialogContent = ({ currentMode, onSelectMode }: AgentsDialogContentProps) => {
  const dialog = useDialog();

  // Seleciona o modo e fecha
  const handleSelect = useCallback(
    (nextMode: ModeType) => {
      onSelectMode(nextMode);
      dialog.close();
    },
    [onSelectMode, dialog],
  );

  return (
    <DialogSearchList
      items={AVAILABLE_MODES}
      onSelect={handleSelect}
      filterFn={(item, query) => getModeLabel(item).toLowerCase().includes(query.toLowerCase())}
      renderItem={(item, isSelected) => (
        <text selectable={false} fg={isSelected ? "black" : "white"}>
          {item === currentMode ? " • " : "   "}
          {getModeLabel(item)}
        </text>
      )}
      getKey={(item) => item}
      placeholder="Search agents"
      emptyText="No matching agents"
    />
  );
};

