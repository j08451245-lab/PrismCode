// =============================================================================
// Visualizador de diff - PrismCode
// Renderiza diffs git com cores: verde para adições, vermelho para remoções.
// Detecta automaticamente se o texto é um diff unificado.
// =============================================================================

import { TextAttributes } from "@opentui/core";
import { useTheme } from "../../providers/theme";

// Tipo de linha de diff
type DiffLine = {
  kind: "header" | "ctx" | "add" | "del" | "hunk"; // Tipo da linha
  text: string; // Conteúdo
};

// Parseia um diff unificado em linhas tipadas
function parseDiff(diffText: string): DiffLine[] {
  const lines: DiffLine[] = [];
  for (const raw of diffText.split("\n")) {
    if (raw.startsWith("---") || raw.startsWith("+++")) {
      lines.push({ kind: "header", text: raw }); // Cabeçalho do diff
    } else if (raw.startsWith("@@")) {
      lines.push({ kind: "hunk", text: raw }); // Marca de hunk
    } else if (raw.startsWith("+")) {
      lines.push({ kind: "add", text: raw }); // Adição
    } else if (raw.startsWith("-")) {
      lines.push({ kind: "del", text: raw }); // Remoção
    } else {
      lines.push({ kind: "ctx", text: raw }); // Contexto (sem mudança)
    }
  }
  return lines;
}

// Verifica se o texto é um diff unificado válido
function isUnifiedDiff(text: string): boolean {
  return /^--- .+\n\+\+\+ /.test(text.trim());
}

type Props = {
  text: string;       // Texto do diff
  maxLines?: number;  // Máximo de linhas visíveis (padrão: 40)
};

// Componente de visualização de diff
export function DiffViewer({ text, maxLines = 40 }: Props) {
  const { colors } = useTheme();
  const lines = parseDiff(text);
  const truncated = lines.length > maxLines;
  const visible = truncated ? lines.slice(0, maxLines) : lines;

  return (
    <box flexDirection="column" width="100%">
      {visible.map((line, i) => {
        // Prefixo da linha
        const prefix =
          line.kind === "add" ? "+ " :
          line.kind === "del" ? "- " : "  ";

        // Cor baseada no tipo
        const color =
          line.kind === "add" ? colors.success :   // Verde
          line.kind === "del" ? colors.error :      // Vermelho
          line.kind === "hunk" ? colors.info :      // Azul
          undefined;                                 // Sem cor (contexto)

        const dim = line.kind === "ctx" || line.kind === "header" || line.kind === "hunk";

        return (
          <box key={i} flexDirection="row" width="100%">
            <text fg={color} attributes={dim ? TextAttributes.DIM : undefined}>
              {prefix}{line.kind === "add" || line.kind === "del" ? line.text.slice(1) : line.text}
            </text>
          </box>
        );
      })}
      {truncated && (
        <text fg={colors.dimSeparator} attributes={TextAttributes.DIM}>
          ... {lines.length - maxLines} more lines truncated
        </text>
      )}
    </box>
  );
}

// Detecta se o texto é um diff unificado
export function detectDiff(text: string): boolean {
  return isUnifiedDiff(text);
}

export { isUnifiedDiff };
