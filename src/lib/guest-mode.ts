import { secureStorage } from '@/src/lib/secure-storage';

export const GUEST_FLAG = 'snapdish.guestMode';

export async function setGuestMode(): Promise<void> {
  await secureStorage.setItemAsync(GUEST_FLAG, '1');
}

export async function clearGuestMode(): Promise<void> {
  await secureStorage.deleteItemAsync(GUEST_FLAG);
}

export async function isGuestMode(): Promise<boolean> {
  const v = await secureStorage.getItemAsync(GUEST_FLAG);
  return v === '1';
}
