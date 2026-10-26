// =============================================================================
// Spinner de carregamento - PrismCode
// Exibe animação de loading enquanto o agente processa.
// Muda de cor baseado no modo atual (BUILD = primária, PLAN = roxo).
// =============================================================================

import "opentui-spinner/react"; // Registra o componente spinner
import { Mode, type ModeType } from "@prismcode543/shared";
import { useTheme } from "../providers/theme";

type Props = {
  mode?: ModeType; // Modo atual (afeta a cor)
};

export function Spinner({ mode = Mode.BUILD }: Props) {
  const { colors } = useTheme();
  // Cor baseada no modo
  const activeColor = mode === Mode.PLAN ? colors.planMode : colors.primary;

  return <spinner name="aesthetic" color={activeColor} />;
};

