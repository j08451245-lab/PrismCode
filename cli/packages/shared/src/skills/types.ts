// =============================================================================
// Tipos do sistema de skills - PrismCode
// Define os tipos TypeScript para o sistema de skills (plugins).
// Skills são extensões que adicionam ferramentas, instruções e templates
// ao agente, permitindo personalizar seu comportamento por projeto.
// =============================================================================

import type { SkillManifest, SkillTool } from "./manifest";

// Tipo do ID de uma skill (string simples)
export type SkillID = string;
// Tipo da versão de uma skill (semver: "1.2.3")
export type SkillVersion = string;

// ---------------------------------------------------------------------------
// Definição completa de uma skill carregada
// Representa uma skill pronta para uso pelo agente
// ---------------------------------------------------------------------------

export type SkillDefinition = {
  manifest: SkillManifest;           // Manifesto da skill (metadados, config)
  instructions: string;              // Instruções em Markdown que o agente recebe
  templates: Map<string, string>;    // Mapa de nome → conteúdo de templates
  installPath: string;               // Caminho no disco onde a skill está instalada
};

// ---------------------------------------------------------------------------
// Handler de ferramenta de uma skill
// Combina a definição da ferramenta com sua função de execução
// ---------------------------------------------------------------------------

export type SkillToolHandler = {
  tool: SkillTool;                                    // Definição da ferramenta (nome, schema)
  execute: (input: unknown) => Promise<unknown>;      // Função que executa a ferramenta
};

// ---------------------------------------------------------------------------
// Runtime de skills: gerencia todas as skills ativas
// Fornece métodos para obter instruções combinadas, ferramentas, etc.
// ---------------------------------------------------------------------------

export type SkillRuntime = {
  skills: SkillDefinition[];                        // Lista de todas as skills carregadas
  getActiveSkills(): SkillDefinition[];             // Retorna apenas skills habilitadas
  getCombinedInstructions(): string;                // Concatena instruções de todas as skills ativas
  getToolHandlers(): SkillToolHandler[];            // Retorna handlers de todas as ferramentas
  getTriggers(): Map<SkillID, string[]>;            // Retorna triggers (arquivos/palavras-chave)
};

// ---------------------------------------------------------------------------
// Constantes de nomes de arquivos e diretórios do sistema de skills
// Usados para encontrar arquivos de skill no disco
// ---------------------------------------------------------------------------

export const SKILL_DIR_NAME = "skills";           // Nome do diretório de skills
export const SKILL_MANIFEST_FILE = "skill.json";  // Arquivo de manifesto
export const SKILL_INSTRUCTIONS_FILE = "instructions.md"; // Arquivo de instruções
export const SKILL_TOOLS_DIR = "tools";           // Diretório de ferramentas
export const SKILL_TEMPLATES_DIR = "templates";   // Diretório de templates
export const SKILL_ENABLED_FILE = ".enabled";     // Arquivo marcador de habilitado
