import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { settings } from "@/api/endpoints"
import type { UserSettings } from "@/types/api"

/**
 * One place that knows how to read and write settings.
 *
 * Every settings screen used to own its own copy of "fetch settings, keep a local
 * mirror, mutate, invalidate" — five screens, five chances to write the optimistic
 * update slightly differently and leave a toggle that flickers back after a
 * refresh. The write is also **not** optimistic here on purpose: these values are
 * server-owned and cheap to read back, and an optimistic toggle that the server
 * rejects is worse than one that waits a beat.
 */
export function useUserSettings() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ["settings"], queryFn: settings.get })
  const mutation = useMutation({
    mutationFn: (patch: Partial<UserSettings>) => settings.update(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  })

  return {
    ...query,
    data: query.data,
    /** Write a partial patch. Returns the mutation so callers can await it. */
    set: (patch: Partial<UserSettings>) => mutation.mutate(patch),
    setAsync: (patch: Partial<UserSettings>) => mutation.mutateAsync(patch),
    saving: mutation.isPending,
  }
}
