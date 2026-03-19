import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  profilePhoto: string | null
  userName: string | null
  userEmail: string | null
  setTokens: (accessToken: string, refreshToken: string) => void
  setProfilePhoto: (profilePhoto: string | null) => void
  setUserProfile: (userName: string, userEmail: string) => void
  clearTokens: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      profilePhoto: null,
      userName: null,
      userEmail: null,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setProfilePhoto: (profilePhoto) => set({ profilePhoto }),
      setUserProfile: (userName, userEmail) => set({ userName, userEmail }),
      clearTokens: () =>
        set({ accessToken: null, refreshToken: null, profilePhoto: null, userName: null, userEmail: null }),
    }),
    { name: 'financehub-auth' },
  ),
)
