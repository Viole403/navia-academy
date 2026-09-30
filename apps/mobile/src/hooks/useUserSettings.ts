import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { settings } from "@/api/endpoints"
import type { UserSettings } from "@/types/api"

/**
 * One place that knows how to read and write settings.
 *
 * Every settings screen used to own its own copy of "fetch settings, keep a local
 * mirror, mutate, invalidate" — five screens, five chances to write the optimistic
 * update slightly differently and leave a toggle that flickers back after a
 * refresh.
 *
 * Writes are optimistic: the cache is patched before the request goes out, so a
 * switch moves under the finger instead of waiting out a PUT and the refetch
 * that follows it. A rejected write restores the previous value rather than
 * leaving the control lying about what the server holds.
 */
export function useUserSettings() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ["settings"], queryFn: settings.get })
  const mutation = useMutation({
    mutationFn: (patch: Partial<UserSettings>) => settings.update(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["settings"] })
      const previous = qc.getQueryData<UserSettings>(["settings"])
      qc.setQueryData<UserSettings>(["settings"], (old) =>
        old ? { ...old, ...patch } : old
      )
      return { previous }
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(["settings"], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["settings"] }),
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
