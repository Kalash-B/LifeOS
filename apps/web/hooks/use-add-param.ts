"use client";

import { useEffect, useState } from "react";

/**
 * Reads `?add=<value>` once (set by Quick add) and strips it from the URL so a
 * refresh doesn't reopen the form.
 */
export function useAddParam(): [string | null, () => void] {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const add = url.searchParams.get("add");
    if (!add) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL after mount
    setValue(add);
    url.searchParams.delete("add");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);
  return [value, () => setValue(null)];
}
