// =============================================================================
// Schema do manifesto de skills - PrismCode
// Define o schema Zod para validar o arquivo skill.json (manifesto).
// O manifesto descreve uma skill: nome, versão, ferramentas,
// instruções, dependências, restrições e triggers.
// =============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema de uma ferramenta de skill
// Define o que uma skill pode fazer (nome, descrição, input, etc.)
// ---------------------------------------------------------------------------

export const skillToolSchema = z.object({
  // Nome da ferramenta: deve começar com letra, só letras/números/underscore
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  // Descrição do que a ferramenta faz (mínimo 1 caractere)
  description: z.string().min(1),
  // Schema JSON do input (opcional - ferramenta pode não ter input)
  inputSchema: z.record(z.string(), z.unknown()).optional(),
  // Código de implementação (para skills com ferramentas inline)
  implementation: z.string().optional(),
  // Se a ferramenta é destrutiva (pode apagar/modificar dados criticamente)
  destructive: z.boolean().optional().default(false),
});

// ---------------------------------------------------------------------------
// Schema de restrições de uma skill
// Define em quais contextos a skill pode ser usada
// ---------------------------------------------------------------------------

export const skillConstraintSchema = z.object({
  // Modos em que a skill pode ser usada (BUILD, PLAN, etc.)
  modes: z.array(z.enum(["BUILD", "PLAN"])).optional(),
  // Modelos de IA compatíveis com a skill
  models: z.array(z.string()).optional(),
  // Padrões de arquivo que ativam a skill
  filePatterns: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// Schema de triggers de uma skill
// Define quando a skill deve ser ativada automaticamente
// ---------------------------------------------------------------------------

export const skillTriggerSchema = z.object({
  // Arquivos que, quando modificados, ativam a skill
  files: z.array(z.string()).optional(),
  // Palavras-chave que ativam a skill quando aparecem no contexto
  keywords: z.array(z.string()).optional(),
  // Eventos do ciclo de vida que ativam a skill
  events: z.array(z.enum(["pre-commit", "post-commit", "pre-build", "post-build"])).optional(),
});

// ---------------------------------------------------------------------------
// Schema principal do manifesto de uma skill (skill.json)
// Validação completa de todos os campos obrigatórios e opcionais
// ---------------------------------------------------------------------------

export const skillManifestSchema = z.object({
  // Nome técnico: slug lowercase com hífens (ex: "react-testing")
  name: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  // Versão semver (ex: "1.0.0")
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  // Nome para exibição ao usuário (1-100 caracteres)
  displayName: z.string().min(1).max(100),
  // Descrição da skill (1-500 caracteres)
  description: z.string().min(1).max(500),
  // Autor (opcional)
  author: z.string().optional(),
  // Licença (opcional)
  license: z.string().optional(),
  // URL da página da skill (deve ser URL válida)
  homepage: z.string().url().optional(),
  // URL do ícone (opcional)
  icon: z.string().optional(),

  // Instruções em Markdown que são injetadas no system prompt do agente
  instructions: z.string().min(1),
  // Lista de ferramentas que a skill adiciona ao agente
  tools: z.array(skillToolSchema).optional().default([]),
  // Lista de templates de arquivo que a skill pode usar
  templates: z.array(z.string()).optional().default([]),

  // Outras skills de que esta depende
  dependencies: z.array(z.string()).optional().default([]),
  // Restrições de uso (modos, modelos, padrões de arquivo)
  constraints: skillConstraintSchema.optional(),
  // Triggers de ativação automática
  triggers: skillTriggerSchema.optional(),

  // Se a skill está habilitada (padrão: true)
  enabled: z.boolean().optional().default(true),
});

// Tipos TypeScript derivados dos schemas Zod
export type SkillManifest = z.infer<typeof skillManifestSchema>;
export type SkillTool = z.infer<typeof skillToolSchema>;
export type SkillConstraint = z.infer<typeof skillConstraintSchema>;
export type SkillTrigger = z.infer<typeof skillTriggerSchema>;
