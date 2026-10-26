import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { Mode, modeSchema } from "@prismcode543/shared";
import { useNavigate, useLocation } from "react-router";
import { SessionShell } from "../components/session-shell";
import { UserMessage } from "../components/messages";
import { useToast } from "../providers/toast";
import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/http-errors";
import { getAuth } from "../lib/auth";
import { getDefaultModel, hasLocalKey } from "../lib/local-model";

const newSessionStateSchema = z.object({
  message: z.string(),
  mode: modeSchema,
  model: z.string(),
});

function shouldUseLocal(): boolean {
  const auth = getAuth();
  if (auth) return false;
  try {
    const { provider } = getDefaultModel();
    return hasLocalKey(provider);
  } catch {
    return false;
  }
}

export function NewSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const hasStartedRef = useRef(false);

  const state = useMemo(() => {
    const parsed = newSessionStateSchema.safeParse(location.state);
    return parsed.success ? parsed.data : null;
  }, [location.state])

  // Guard: if navigated here directly without state, go home
  useEffect(() => {
    if (!state) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  // Create the session on mount — this screen exists to do this
  useEffect(() => {
    if (!state || hasStartedRef.current) return;

    hasStartedRef.current = true;

    // Se tem BYOK configurado e não tem auth, cria sessão local
    if (shouldUseLocal()) {
      const localSession = {
        id: crypto.randomUUID(),
        title: state.message.slice(0, 100),
        messages: [] as never[],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        systemPrompt: "",
        currentMode: state.mode,
        credits: null,
        isPremium: false,
      } as const;
      navigate(
        `/sessions/${localSession.id}`,
        { replace: true, state: { session: localSession, initialPrompt: state } }
      );
      return;
    }

    let ignore = false;
    const createSession = async () => {
      try {
        const res = await apiClient.sessions.$post({
          json: {
            title: state.message.slice(0, 100),
          },
        });

        if (ignore) return;
        if (!res.ok) {
          throw new Error(await getErrorMessage(res));
        }
        const session = await res.json();
        navigate(
          `/sessions/${session.id}`,
          { replace: true, state: { session, initialPrompt: state } }
        );
      } catch (error) {
        if (ignore) return;
        toast.show({
          variant: "error",
          message: error instanceof Error ? error.message : "Failed to create session",
        });
        navigate("/", { replace: true });
      }
    };

    createSession();
    return () => {
      ignore = true;
    };
  }, [state, navigate, toast]);

  if (!state) return null;

  return (
    <SessionShell onSubmit={() => {}} inputDisabled loading>
      <UserMessage message={state.message} mode={state.mode} />
    </SessionShell>
  );
};

