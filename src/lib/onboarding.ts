// Onboarding-modal seen/dismissed flags — localStorage (antrean #306): the
// welcome tour shows once per login. The Supabase session also lives in
// localStorage, so a new tab or a reopened browser while still logged in must
// not show the tour again (sessionStorage did, because it is per tab).
// The flag is cleared on every successful sign-in (Login.tsx) and on logout
// (Layout.tsx), so the next login — even after the session simply expired —
// shows the tour once.

export type OnboardingRole = 'mahasiswa' | 'dosen'

function onboardingKey(role: OnboardingRole): string {
  return role === 'dosen' ? 'sfp_onboarded_dos_v1' : 'sfp_onboarded_v1'
}

export function hasSeenOnboarding(role: OnboardingRole): boolean {
  try {
    return Boolean(localStorage.getItem(onboardingKey(role)))
  } catch {
    return true
  }
}

export function markOnboardingSeen(role: OnboardingRole): void {
  try {
    localStorage.setItem(onboardingKey(role), '1')
  } catch {
    // ignore — worst case the modal reappears next visit, not destructive
  }
  // Layout menunggu WelcomeModal ditutup sebelum memulai tur panduan (antrean #331).
  dispatchEvent(new Event(EVENT_ONBOARDING_SELESAI))
}

export const EVENT_ONBOARDING_SELESAI = 'sfp-onboarding-selesai'

export function resetOnboarding(role: OnboardingRole): void {
  try {
    localStorage.removeItem(onboardingKey(role))
  } catch {
    // ignore
  }
}

/** Dipanggil saat login berhasil: peran belum pasti, jadi tanda kedua peran dihapus. */
export function resetSemuaOnboarding(): void {
  resetOnboarding('mahasiswa')
  resetOnboarding('dosen')
}
