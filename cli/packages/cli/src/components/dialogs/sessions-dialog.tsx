// =============================================================================
// Diálogo de sessões - PrismCode
// Lista as sessões anteriores do usuário com busca.
// Permite navegar para uma sessão existente.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { format } from "date-fns";
import { useNavigate } from "react-router";
import { useDialog } from "../../providers/dialog";
import { useToast } from "../../providers/toast";
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
  const { close } = useDialog();
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

  if (loading) {
    return (
      <box flexDirection="column">
        <text attributes={TextAttributes.DIM}>Loading sessions...</text>
      </box>
    );
  }

  return (
    <DialogSearchList
      items={sessions}
      onSelect={handleSelect}
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
  );
};
