"use client"

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import {
  getStoredSession,
  signIn as doSignIn,
  signUp as doSignUp,
  signOut as doSignOut,
  requestPasswordReset,
  subscribeAuth,
  refreshSession,
  type AuthSession,
} from "@/lib/auth-client"

export interface AppUser {
  uid: string
  email: string
  displayName: string
  emailVerified: boolean
  provider: "password" | "google" | "local"
  role: "student" | "contributor" | "reviewer" | "admin"
}

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  signUp: (name: string, email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<AppUser | null>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  changePassword: () => Promise<void>
  /** contributor/reviewer/admin → true (can write content). */
  isContributor: boolean
  /** reviewer/admin → true (can review/publish content). */
  isReviewer: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const EDITOR_ROLES = new Set(["contributor", "reviewer", "admin"])

export type AppRole = AppUser["role"]

/** Post-auth home per role: student → learner dash, staff → their workspace. */
export function roleHomePath(role: AppRole): string {
  switch (role) {
    case "admin":
      return "/dashboard/admin"
    case "contributor":
    case "reviewer":
      return "/dashboard/contributor"
    default:
      return "/dashboard"
  }
}

function toAppUser(session: AuthSession | null): AppUser | null {
  if (!session?.user) return null
  const u = session.user
  return {
    uid: u.uid,
    email: u.email ?? "",
    displayName: u.displayName || u.email || "User",
    emailVerified: !!u.emailVerified,
    provider: "password",
    role: (u.role as AppUser["role"]) || "student",
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [session, setSession] = useState<AuthSession | null>(() => {
    if (typeof window === "undefined") return null
    return getStoredSession()
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeAuth(() => setSession(getStoredSession()))
    // Validate / refresh the stored session on first load.
    ;(async () => {
      if (getStoredSession()) {
        const refreshed = await refreshSession()
        setSession(refreshed ?? getStoredSession())
      }
      setLoading(false)
    })()
    return unsub
  }, [])

  const user = useMemo(() => toAppUser(session), [session])

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await doSignUp(name, email, password)
    },
    []
  )

  const signIn = useCallback(async (email: string, password: string) => {
    await doSignIn(email, password)
    return toAppUser(getStoredSession())
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await doSignInWithGoogle()
  }, [])

  const signOut = useCallback(async () => {
    await doSignOut()
    router.push("/")
  }, [router])

  const resetPassword = useCallback(async (email: string) => {
    await requestPasswordReset(email)
  }, [])

  const changePassword = useCallback(async () => {
    throw new Error(
      "Password change requires your current password. Use the form in Settings."
    )
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      changePassword,
      isContributor: !!user && EDITOR_ROLES.has(user.role),
      isReviewer: !!user && (user.role === "reviewer" || user.role === "admin"),
    }),
    [
      user,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      changePassword,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

async function doSignInWithGoogle(): Promise<void> {
  const { signInWithGoogle } = await import("@/lib/auth-client")
  await signInWithGoogle()
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
