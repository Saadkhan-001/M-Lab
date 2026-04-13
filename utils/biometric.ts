import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'lab_biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = 'lab_secure_creds';

export type SecureCredentials = {
  email: string;
  password: string;
};

export const BiometricService = {
  /**
   * Check if biometrics are supported and enrolled
   */
  async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  /**
   * Check if the user has enabled biometrics in settings
   */
  async isEnabled(): Promise<boolean> {
    return (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === 'true';
  },

  /**
   * Enable/Disable biometric preference
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  },

  /**
   * Save credentials to secure storage
   */
  async saveCredentials(creds: SecureCredentials): Promise<void> {
    await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(creds));
  },

  /**
   * Get credentials from secure storage
   */
  async getCredentials(): Promise<SecureCredentials | null> {
    const data = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Clear all biometric data
   */
  async clearAll(): Promise<void> {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
  },

  /**
   * Trigger the biometric prompt
   */
  async authenticate(): Promise<LocalAuthentication.LocalAuthenticationResult> {
    return await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access LabSync OS',
      fallbackLabel: 'Enter Password',
      disableDeviceFallback: false,
    });
  },
};
