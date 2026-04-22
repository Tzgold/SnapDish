import * as SecureStore from 'expo-secure-store';

function readLocalStorage(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
    // Ignore local storage errors in restricted environments.
  }
}

function removeLocalStorage(key: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  } catch {
    // Ignore local storage errors in restricted environments.
  }
}

export const secureStorage = {
  async getItemAsync(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return readLocalStorage(key);
    }
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch {
      writeLocalStorage(key, value);
    }
  },
  async deleteItemAsync(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      return;
    } catch {
      removeLocalStorage(key);
    }
  },
};
