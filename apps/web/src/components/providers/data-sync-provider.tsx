"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useProgress, loadProgressFromServer, loadProgressFromCache, markProgressSynced } from "@/stores/progress";
import { useSettings, loadSettingsFromServer, loadSettingsFromCache, markSettingsSynced } from "@/stores/settings";

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const loadP = useProgress((s) => s.load);
  const loadS = useSettings((s) => s.load);
  const unsubRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    unsubRef.current.forEach((fn) => fn());
    if (!user) {
      const cachedP = loadProgressFromCache();
      if (cachedP) loadP(cachedP);
      markProgressSynced();
      const cachedS = loadSettingsFromCache();
      if (cachedS) loadS(cachedS);
      markSettingsSynced();
      return;
    }

    (async () => {
      const cachedP = loadProgressFromCache();
      if (cachedP) loadP(cachedP);
      const serverP = await loadProgressFromServer();
      if (serverP) loadP({ ...cachedP, ...serverP });
      markProgressSynced();

      const cachedS = loadSettingsFromCache();
      if (cachedS) loadS(cachedS);
      const serverS = await loadSettingsFromServer();
      if (serverS) loadS({ ...cachedS, ...serverS });
      markSettingsSynced();

      const { subscribeProgress } = await import("@/stores/progress");
      const { subscribeSettings } = await import("@/stores/settings");
      unsubRef.current = [
        subscribeProgress(),
        subscribeSettings(),
      ];
    })();

    return () => {
      unsubRef.current.forEach((fn) => fn());
      unsubRef.current = [];
    };
  }, [user, loadP, loadS]);

  return children;
}
