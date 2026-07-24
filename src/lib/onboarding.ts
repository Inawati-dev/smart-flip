// Onboarding-modal seen/dismissed flags — sessionStorage (NOT localStorage):
// the welcome tour should reappear every fresh login, not just once ever per
// browser. sessionStorage clears itself when the tab/browser closes, and
// doLogout (Layout.tsx / Profil.tsx) also clears it explicitly on sign-out,
// so re-logging in — even as a different account in the same tab — always
// shows the tour again instead of it being permanently dismissed.

export type OnboardingRole = 'mahasiswa' | 'dosen'

function onboardingKey(role: OnboardingRole): string {
  return role === 'dosen' ? 'sfp_onboarded_dos_v1' : 'sfp_onboarded_v1'
}

export function hasSeenOnboarding(role: OnboardingRole): boolean {
  try {
    return Boolean(sessionStorage.getItem(onboardingKey(role)))
  } catch {
    return true
  }
}

export function markOnboardingSeen(role: OnboardingRole): void {
  try {
    sessionStorage.setItem(onboardingKey(role), '1')
  } catch {
    // ignore — worst case the modal reappears next visit, not destructive
  }
}

export function resetOnboarding(role: OnboardingRole): void {
  try {
    sessionStorage.removeItem(onboardingKey(role))
  } catch {
    // ignore
  }
}
