import "dotenv/config";
import { DEFAULT_CHAT_MODEL_ID } from "@prismcode543/shared";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { RootLayout } from "./layouts/root-layout";
import { Home } from "./screens/home";
import { NewSession } from "./screens/new-session";
import { Session } from "./screens/session";

const args = process.argv.slice(2);
const isAuto = args.includes("--auto");
if (isAuto) {
  process.env.PRISMCODE_AUTO = "1";
}
let initialEntries = ["/"];
let initialMessage = "";
const runIndex = args.indexOf("run");
if (runIndex !== -1 && args[runIndex + 1]) {
  const promptArgs = args.slice(runIndex + 1).filter(a => a !== "--auto");
  if (promptArgs.length > 0) {
    initialMessage = promptArgs.join(" ");
  }
} else {
  const promptArgs = args.filter(a => !a.startsWith("--") && a !== "run");
  if (promptArgs.length > 0) {
    initialMessage = promptArgs.join(" ");
  }
}

const router = createMemoryRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <text fg="red">Unexpected error occurred</text>,
    children: [
      { index: true, element: <Home initialMessage={initialMessage} /> },
      { path: "sessions/new", element: <NewSession /> },
      { path: "sessions/:id", element: <Session /> },
    ]
  }
], { initialEntries });

function App() {
  return <RouterProvider router={router} />
}

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false,
});
createRoot(renderer).render(<App />);
