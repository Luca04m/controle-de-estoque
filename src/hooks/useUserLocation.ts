import { useAuthStore } from '@/stores/authStore'

/**
 * Returns the current user's location_id (if operator) and role.
 * Used by pages to auto-select location and restrict visibility.
 */
export function useUserLocation() {
  const { profile } = useAuthStore()

  const isManager = profile?.role === 'manager'
  const userLocationId = profile?.location_id ?? null

  return {
    isManager,
    userLocationId,
    /** The location to use for filtering — null means "all locations" (manager only) */
    defaultLocationId: isManager ? null : userLocationId,
  }
}
