// =============================================================================
// Sistema de logging - PrismCode
// Logger simples com níveis de severidade. Lê o nível mínimo da
// variável de ambiente LOG_LEVEL. Usa console.log/warn/error
// apropriadamente para cada nível.
// =============================================================================

// Níveis de log em ordem crescente de severidade
// Apenas mensagens com nível >= minLevel são exibidas
export const LogLevel = {
  DEBUG: 0,  // Informações detalhadas para debug
  INFO: 1,  // Informações gerais de funcionamento
  WARN: 2,  // Avisos (algo inesperado mas não crítico)
  ERROR: 3, // Erros (algo quebrado)
} as const;

// Tipo derivado do enum LogLevel
export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];

// Mapeamento de nível numérico para nome legível
const levelNames: Record<LogLevelType, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
};

// Lê o nível de log da variável de ambiente LOG_LEVEL
// Padrão é INFO se não estiver definido
function getEnvLevel(): LogLevelType {
  const env = process.env.LOG_LEVEL?.toUpperCase();
  switch (env) {
    case "DEBUG": return LogLevel.DEBUG;
    case "INFO": return LogLevel.INFO;
    case "WARN": return LogLevel.WARN;
    case "ERROR": return LogLevel.ERROR;
    default: return LogLevel.INFO; // Nível padrão
  }
}

// Classe Logger - implementa o padrão singleton (uma instância global)
class Logger {
  // Nível mínimo: mensagens abaixo deste nível são ignoradas
  private minLevel: LogLevelType = getEnvLevel();

  // Método privado que faz o log efetivo
  private log(level: LogLevelType, ...args: unknown[]) {
    // Se o nível da mensagem for menor que o mínimo, ignora
    if (level < this.minLevel) return;

    // Formata o timestamp ISO para o log
    const timestamp = new Date().toISOString();
    // Prefixo com o nome do nível (ex: [INFO], [ERROR])
    const prefix = `[${levelNames[level]}]`;

    // Escolhe a função de console apropriada:
    // - ERROR e acima → console.error (saída de erro)
    // - WARN → console.warn (saída de aviso)
    // - DEBUG e INFO → console.log (saída normal)
    const fn = level >= LogLevel.ERROR ? console.error
      : level >= LogLevel.WARN ? console.warn
      : console.log;

    fn(prefix, ...args);
  }

  // Métodos públicos para cada nível de log
  debug(...args: unknown[]) { this.log(LogLevel.DEBUG, ...args); }
  info(...args: unknown[]) { this.log(LogLevel.INFO, ...args); }
  warn(...args: unknown[]) { this.log(LogLevel.WARN, ...args); }
  error(...args: unknown[]) { this.log(LogLevel.ERROR, ...args); }
}

// Instância singleton do logger - importar e usar em qualquer lugar
// Ex: import { logger } from "@prismcode543/shared"; logger.info("OK");
export const logger = new Logger();
