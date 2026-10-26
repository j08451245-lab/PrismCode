// =============================================================================
// Mensagem do usuário - PrismCode
// Renderiza uma mensagem enviada pelo usuário com borda colorida
// baseada no modo atual (BUILD = primária, PLAN = roxo).
// Suporta exibição de imagens anexadas.
// =============================================================================

import { Mode, type ModeType } from "@prismcode543/shared";
import { EmptyBorder } from "../border";
import { useTheme } from "../../providers/theme";
import type { ImageAttachment } from "../../hooks/use-chat";

type Props = {
  message: string;            // Texto da mensagem
  mode: ModeType;             // Modo atual (afeta cor da borda)
  images?: ImageAttachment[]; // Imagens anexadas (opcional)
};

export function UserMessage({ message, mode, images }: Props) {
  const { colors } = useTheme();

  return (
    <box width="100%" alignItems="center">
      <box
        border={["left"]}
        borderColor={mode === Mode.PLAN ? colors.planMode : colors.primary}        width="100%"
        customBorderChars={{ ...EmptyBorder, vertical: "┃", bottomLeft: "╹" }}
      >
        <box justifyContent="center" paddingX={2} paddingY={1} backgroundColor={colors.surface} width="100%">
          <box flexDirection="column" width="100%">
            {/* Lista de imagens anexadas */}
            {images && images.length > 0 && (
              <box flexDirection="row" gap={1} paddingBottom={1}>
                {images.map((img, i) => (
                  <text key={i} fg={colors.info}>{`[IMG] ${img.path}`}</text>
                ))}
              </box>
            )}
            <text>{message}</text>
          </box>
        </box>
      </box>
    </box>
  );
};

