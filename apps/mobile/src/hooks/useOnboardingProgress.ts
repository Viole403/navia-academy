import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { progress } from "@/api/endpoints"
import type { OnboardingState, UserProgress } from "@/types/api"
import { useAuthStore } from "@/store/auth"

/**
 * Onboarding state that follows the account rather than the device.
 *
 * It lived in a device-keyed zustand store, so signing in on a second device put
 * a learner who had already finished back at step zero with their language reset
 * to Mandarin. The server keeps the same record and already carries the goal, the
 * exam and the daily target, so nothing here is new schema.
 *
 * Reads are disabled until there is a session: the entry gate runs before the
 * auth redirect, and an unauthenticated /progress would only produce a 401.
 */
export function useOnboardingProgress() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ["progress"],
    queryFn: progress.get,
    select: (d: UserProgress) => d.onboarding ?? null,
    enabled: !!user,
  })

  const mutation = useMutation({
    mutationFn: (patch: Partial<OnboardingState>) =>
      progress.update({ onboarding: { ...query.data, ...patch } }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["progress"] })
      const previous = qc.getQueryData<UserProgress>(["progress"])
      if (previous) {
        qc.setQueryData<UserProgress>(["progress"], (old) =>
          old
            ? {
                ...old,
                // The literals keep `completed` and `step` required; spreading a
                // possibly-absent record would widen them to `| undefined`.
                onboarding: {
                  completed: false,
                  step: 0,
                  ...old.onboarding,
                  ...patch,
                },
              }
            : old
        )
      }
      return { previous }
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.previous) qc.setQueryData(["progress"], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  })

  return {
    onboarding: query.data ?? null,
    /** True while the account's record is in flight — the gate must wait. */
    loading: !!user && query.isLoading,
    save: (patch: Partial<OnboardingState>) => mutation.mutate(patch),
  }
}
