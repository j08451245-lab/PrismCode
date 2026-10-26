// =============================================================================
// Raiz com tema - PrismCode
// Componente wrapper que aplica a cor de fundo do tema atual
// a toda a interface.
// =============================================================================

import type { ReactNode } from "react";
import { useTheme } from "../providers/theme";

type Props = {
  children: ReactNode;
};

export function ThemedRoot({ children }: Props) {
  const { colors } = useTheme();

  return (
    <box backgroundColor={colors.background} width="100%" height="100%" flexGrow={1}>
      {children}
    </box>
  );
};
