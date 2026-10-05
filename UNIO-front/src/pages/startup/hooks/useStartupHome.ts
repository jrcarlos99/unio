import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { getApiErrorMessage } from "../../../services/api";
import { fetchStartupHome } from "../services/startupHomeService";
import type { StartupHomeResponse } from "../types";

export type StartupHomeState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: StartupHomeResponse };

function isAbortError(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof DOMException && error.name === "AbortError");
}

export function useStartupHome() {
  const [state, setState] = useState<StartupHomeState>({ status: "loading" });
  
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchStartupHome(controller.signal)
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setState({
          status: "error",
          message: getApiErrorMessage(error, "Não foi possível carregar sua página inicial."),
        });
      });

    return () => controller.abort();
  }, [requestKey]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setRequestKey((key) => key + 1);
  }, []);

  return { state, reload };
}