"use client";
import { useCallback, useEffect, useState } from "react";
import { message } from "./format";
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    loader()
      .then(setData)
      .catch((e) => setError(message(e)))
      .finally(() => setLoading(false));
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, loading, error, reload, setData };
}
