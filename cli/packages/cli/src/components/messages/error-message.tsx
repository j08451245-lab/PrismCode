// =============================================================================
// Mensagem de erro - PrismCode
// Renderiza uma mensagem de erro com borda vermelha.
// =============================================================================

import { TextAttributes } from "@opentui/core";
import { EmptyBorder } from "../border";
import { useTheme } from "../../providers/theme";

type Props = {
  message: string; // Texto da mensagem de erro
};

export function ErrorMessage({ message }: Props) {
  const { colors } = useTheme();

  return (
    <box width="100%" alignItems="center">
      <box
        border={["left"]}
        borderColor={colors.error} // Borda vermelha
        width="100%"
        customBorderChars={{ ...EmptyBorder, vertical: "┃", bottomLeft: "╹" }}
      >
        <box justifyContent="center" paddingX={2} paddingY={1} backgroundColor={colors.surface} width="100%">
          <text attributes={TextAttributes.DIM}>{message}</text>
        </box>
      </box>
    </box>
  );
};
