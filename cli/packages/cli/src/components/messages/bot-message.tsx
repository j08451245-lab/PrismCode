// =============================================================================
// Mensagem do agente (bot) - PrismCode
// Renderiza a resposta do agente IA com suporte a:
// - Texto normal
// - Raciocínio (thinking/reasoning)
// - Chamadas de ferramenta (tool calls)
// - Metadados (modo, modelo, duração)
// Agrupa partes consecutivas do mesmo tipo para melhor organização visual.
// =============================================================================

import prettyMs from "pretty-ms";             // Formata milissegundos para legível
import { EmptyBorder } from "../border";
import { useTheme } from "../../providers/theme";
import type { Message } from "../../hooks/use-chat";
import { Mode, type ModeType } from "@prismcode543/shared";
import { TextAttributes } from "@opentui/core";

// Tipos auxiliares para partes de mensagem
type ClientMessagePart = Message["parts"][number];
type ToolPart = Extract<ClientMessagePart, { type: `tool-${string}` | "dynamic-tool" }>;

type Props = {
  parts: ClientMessagePart[]; // Partes da mensagem (texto, tool calls, reasoning)
  model: string;              // Modelo usado
  mode: ModeType;             // Modo atual
  durationMs?: number;        // Duração da resposta
  streaming?: boolean;        // Se ainda está em streaming
};

// Formata nome da ferramenta: camelCase → "Camel Case"
function formatToolName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
};

// Verifica se uma parte é uma chamada de ferramenta
function isToolPart(part: ClientMessagePart): part is ToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
};

// Formata os argumentos de uma ferramenta para exibição
function formatToolArgs(tc: ToolPart): string {
  if (!("input" in tc) || tc.input == null) return "";
  if (typeof tc.input !== "object") return String(tc.input);
  return Object.values(tc.input).map(String).join(" ");
}

// Tipo de grupo de partes consecutivas do mesmo tipo
type PartGroup = {
  type: ClientMessagePart["type"];
  parts: ClientMessagePart[];
  key: string;
};

// Agrupa partes consecutivas do mesmo tipo (ex: vários tool calls juntos)
function groupConsecutiveParts(parts: ClientMessagePart[]): PartGroup[] {
  const groups: PartGroup[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.type === part.type) {
      lastGroup.parts.push(part); // Mesma tipo: adiciona ao grupo
    } else {
      // Novo tipo: cria novo grupo
      const key = isToolPart(part) ? `group-tc-${part.toolCallId}` : `group-${part.type}-${i}`;
      groups.push({ type: part.type, parts: [part], key });
    }
  }

  return groups;
};

// Componente principal: renderiza mensagem do agente
export function BotMessage({
  parts,
  model,
  mode,
  durationMs,
  streaming = false,
}: Props) {
  const { colors } = useTheme();
  return (
    <box width="100%" alignItems="center">
      {groupConsecutiveParts(parts).map((group, i) => (
        <box key={group.key} width="100%" paddingTop={i === 0 ? 0 : 1}>
          {group.parts.map((part, j) => {
            // Parte de raciocínio (thinking)
            if (part.type === "reasoning") {
              return (
                <box key={`reasoning-${j}`} border={["left"]} borderColor={colors.thinkingBorder}
                  customBorderChars={{ ...EmptyBorder, vertical: "│" }} width="100%" paddingX={2}>
                  <text attributes={TextAttributes.DIM} fg={colors.thinking}>Thinking: </text>
                  <text>{part.text}</text>
                </box>
              );
            }

            // Chamada de ferramenta
            if (isToolPart(part)) {
              const toolName = part.type === "dynamic-tool" ? part.toolName : part.type.slice("tool-".length);
              const toolArgs = formatToolArgs(part);
              const isLoading = part.state !== "output-available" && part.state !== "output-error";
              const isError = part.state === "output-error";
              return (
                <box key={part.toolCallId} border={["left"]} borderColor={colors.thinkingBorder}
                  customBorderChars={{ ...EmptyBorder, vertical: "│" }} width="100%" paddingX={2}>
                  <text attributes={TextAttributes.DIM} fg={colors.info}>{formatToolName(toolName)}: </text>
                  <text attributes={TextAttributes.DIM}>{toolArgs}{isLoading ? " …" : ""}{isError ? ` ${part.errorText}` : ""}</text>
                </box>
              );
            }

            // Texto normal
            if (part.type === "text") {
              return (
                <box key={`text-${j}`} paddingX={3} width="100%">
                  <text>{part.text}</text>
                </box>
              );
            }

            return null;
          })}
        </box>
      ))}

      <box paddingX={3} paddingY={1} gap={1} width="100%">
        <box flexDirection="row" gap={2}>
          <text fg={mode === Mode.PLAN ? colors.planMode : colors.primary}>◉</text>
          <box flexDirection="row" gap={1}>
            <text>{mode === Mode.PLAN ? "Plan" : "Build"}</text>
            <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>›</text>
            <text attributes={TextAttributes.DIM}>{model}</text>
            {durationMs != null && (
              <text attributes={TextAttributes.DIM}>
                <text fg={colors.dimSeparator}>› </text>
                <text>{prettyMs(durationMs)}</text>
              </text>
            )}
          </box>
        </box>
      </box>
    </box>
  );
};
