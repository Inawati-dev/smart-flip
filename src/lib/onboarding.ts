// Onboarding-modal seen/dismissed flags — pure localStorage, same keys as
// the legacy vanilla app (sfp_onboarded_v1 / sfp_onboarded_dos_v1), so this
// is deliberately per-browser only, not synced through Supabase like the
// rest of src/lib/*.ts.

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
}

export function resetOnboarding(role: OnboardingRole): void {
  try {
    localStorage.removeItem(onboardingKey(role))
  } catch {
    // ignore
  }
}
