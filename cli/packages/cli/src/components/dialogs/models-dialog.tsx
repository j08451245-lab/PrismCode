// =============================================================================
// Diálogo de seleção de modelo - PrismCode
// Lista todos os modelos de IA suportados com busca.
// Permite ao usuário escolher qual modelo usar.
// =============================================================================

import { useCallback } from "react";
import { useDialog } from "../../providers/dialog";
import { DialogSearchList } from "../dialog-search-list";
import { Mode } from "@prismcode543/shared";
import type { SupportedChatModelId } from "@prismcode543/shared";

type ModelsDialogContentProps = {
  models: SupportedChatModelId[];  // Lista de modelos disponíveis
  onSelectModel: (modelId: SupportedChatModelId) => void; // Callback de seleção
};

export const ModelsDialogContent = ({ models, onSelectModel }: ModelsDialogContentProps) => {
  const dialog = useDialog();

  // Seleciona o modelo e fecha o diálogo
  const handleSelect = useCallback(
    (modelId: SupportedChatModelId) => {
      onSelectModel(modelId);
      dialog.close();
    },
    [dialog, onSelectModel],
  );

  return (
    <DialogSearchList
      items={models}
      onSelect={handleSelect}
      filterFn={(modelId, query) => modelId.toLowerCase().includes(query.toLowerCase())}
      renderItem={(modelId, isSelected) => (
        <text selectable={false} fg={isSelected ? "black" : "white"}>
          {modelId}
        </text>
      )}
      getKey={(modelId) => modelId}
      placeholder="Search models"
      emptyText="No matching models"
    />
  );
};

