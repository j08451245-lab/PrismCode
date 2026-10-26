// PrismCode app tools that only read state stay available in Plan mode; every other app tool is blocked.
const PLAN_APP_TOOLS = new Set([
  'prismcode_title', 'prismcode_team_directory', 'prismcode_read_team_mailbox',
  'prismcode_list_tasks', 'prismcode_read_task', 'prismcode_search_tasks', 'prismcode_list_projects',
  'prismcode_list_workers', 'prismcode_read_worker', 'prismcode_list_subagents', 'prismcode_list_queue',
  'prismcode_list_local_servers', 'prismcode_list_moodboards', 'prismcode_read_moodboard', 'prismcode_read_moodboard_image',
  'prismcode_vm_list', 'prismcode_vm_screenshot', 'prismcode_simulator_devices', 'prismcode_simulator_describe',
  'prismcode_simulator_screenshot', 'prismcode_jev_read', 'prismcode_jev_list', 'prismcode_jev_screenshot',
  'prismcode_jev_assessments', 'prismcode_bot_recall', 'prismcode_bot_list_schedules', 'prismcode_code_search',
]);

export default async function (pi) {
  const config = JSON.parse(process.env.PRISMCODE_PI_BRIDGE);
  // The bearer token must not reach the commands Pi runs (they inherit this environment).
  delete process.env.PRISMCODE_PI_BRIDGE;
  const request = async (method, params, signal) => {
    const response = await fetch(config.url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: config.authorization },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!response.ok) throw new Error('PrismCode tools connection failed.');
    const result = await response.json();
    if (result.error) throw new Error(result.error.message);
    return result.result;
  };
  const tools = config.url ? (await request('tools/list', {})).tools : [];
  const names = new Set(tools.map(tool => tool.name));
  for (const tool of tools) {
    pi.registerTool({
      name: tool.name,
      label: tool.name,
      // omp hides extension tools behind discovery unless they are essential; Pi ignores this.
      loadMode: 'essential',
      description: tool.description,
      parameters: tool.inputSchema,
      async execute(_id, args, signal) {
        const result = await request('tools/call', { name: tool.name, arguments: args }, signal);
        if (result.isError) throw new Error(result.content.filter(item => item.type === 'text').map(item => item.text).join('\n'));
        return result;
      },
    });
  }
  pi.on('session_start', (_event, ctx) => ctx.ui.setStatus('prismcode-bridge', 'ready'));
  pi.on('tool_call', async (event, ctx) => {
    const app = names.has(event.toolName);
    if (['read', 'grep', 'find', 'ls'].includes(event.toolName) || (app && PLAN_APP_TOOLS.has(event.toolName))) return;
    if (config.mode === 'plan') return { block: true, reason: 'This tool is unavailable in Plan mode.' };
    if (app) return;
    if (config.mode === 'full') return;
    if (config.mode === 'auto' && ['edit', 'write'].includes(event.toolName)) return;
    try {
      if (await ctx.ui.confirm(`Allow ${event.toolName}?`, JSON.stringify(event.input).slice(0, 4000))) return;
    } catch {}
    return { block: true, reason: 'Declined by the user.' };
  });
}
