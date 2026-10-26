// =============================================================================
// Cabeçalho do CLI - PrismCode
// Exibe o logo "PrismCode" em ASCII art.
// =============================================================================

export function Header() {
  return (
    <box justifyContent="center" alignItems="center" flexDirection="column" gap={0}>
      <box flexDirection="row" justifyContent="center" gap={0.5} alignItems="center">
        <ascii-font font="tiny" text="Prism" color="gray" />
        <ascii-font font="tiny" text="Code" />
      </box>
    </box>
  );
};
