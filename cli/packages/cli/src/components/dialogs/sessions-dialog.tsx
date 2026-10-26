// =============================================================================
// Diálogo de sessões - PrismCode
// Lista as sessões anteriores do usuário com busca.
// Permite navegar para uma sessão existente e excluir com Ctrl+D.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { format } from "date-fns";
import { useNavigate } from "react-router";
import { useDialog } from "../../providers/dialog";
import { useToast } from "../../providers/toast";
import { useKeyboardLayer } from "../../providers/keyboard-layer";
import { apiClient } from "../../lib/api-client";
import { getErrorMessage } from "../../lib/http-errors";
import { DialogSearchList } from "../dialog-search-list";

// Tipo de uma sessão
type Session = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export const SessionsDialogContent = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { close } = useDialog();
  const { isTopLayer } = useKeyboardLayer();
  const navigate = useNavigate();
  const { show } = useToast();

  // Busca sessões do servidor ao montar
  useEffect(() => {
    let ignore = false;

    const fetchSessions = async () => {
      try {
        const res = await apiClient.sessions.$get();
        if (!res.ok) throw new Error(await getErrorMessage(res));
        const data = (await res.json()) as any;
        if (!ignore) { setSessions(data); setLoading(false); }
      } catch (error) {
        if (!ignore) {
          show({ variant: "error", message: error instanceof Error ? error.message : "Failed to fetch sessions" });
          close();
        }
      }
    };

    fetchSessions();
    return () => { ignore = true; };
  }, [close, show]);

  // Navega para a sessão selecionada
  const handleSelect = useCallback(
    (session: Session) => { close(); navigate(`/sessions/${session.id}`); },
    [close, navigate],
  );

  // Exclui a sessão confirmada e remove da lista local
  const handleDelete = useCallback(async (session: Session) => {
    setDeleting(true);
    try {
      const res = await apiClient.sessions[":id"].$delete({ param: { id: session.id } });
      // 404: já foi removida em outro lugar; trata como sucesso
      if (!res.ok && res.status !== 404) {
        throw new Error(await getErrorMessage(res));
      }
      setSessions((prev) => prev.filter((item) => item.id !== session.id));
      setPendingDelete(null);
      show({ variant: "success", message: "Session deleted" });
    } catch (error) {
      show({ variant: "error", message: error instanceof Error ? error.message : "Failed to delete session" });
    } finally {
      setDeleting(false);
    }
  }, [show]);

  // Confirmação da exclusão (Y = excluir, N/Esc = cancelar)
  useKeyboard((key) => {
    if (deleting || !pendingDelete || !isTopLayer("dialog")) return;

    if (key.name === "y") {
      key.preventDefault();
      void handleDelete(pendingDelete);
    } else if (key.name === "n" || key.name === "escape") {
      key.preventDefault();
      setPendingDelete(null);
    }
  });

  if (loading) {
    return (
      <box flexDirection="column">
        <text attributes={TextAttributes.DIM}>Loading sessions...</text>
      </box>
    );
  }

  if (pendingDelete) {
    const title = pendingDelete.title.replace(/\s+/g, " ").slice(0, 60);
    return (
      <box flexDirection="column" gap={1}>
        <text>Delete "{title}"?</text>
        <text attributes={TextAttributes.DIM}>
          {deleting ? "Deleting..." : "This cannot be undone. Y = Delete  N = Cancel"}
        </text>
      </box>
    );
  }

  return (
    <box flexDirection="column" gap={1}>
      <DialogSearchList
        items={sessions}
        onSelect={handleSelect}
        onDelete={setPendingDelete}
        filterFn={(s, query) => s.title.toLowerCase().includes(query.toLowerCase())}
        renderItem={(session, isSelected) => (
          <>
            <text selectable={false} fg={isSelected ? "black" : "white"}>{session.title}</text>
            <box flexGrow={1} />
            <text selectable={false} fg={isSelected ? "black" : undefined} attributes={TextAttributes.DIM}>
              {format(new Date(session.createdAt), "hh:mm a")}
            </text>
          </>
        )}
        getKey={(s) => s.id}
        placeholder="Search sessions"
        emptyText="No matching sessions"
      />
      <text attributes={TextAttributes.DIM}>Ctrl+D = delete selected session</text>
    </box>
  );
};
