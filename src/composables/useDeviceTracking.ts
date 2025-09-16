import { ref, onMounted, onUnmounted } from 'vue';
import { Device, DeviceInfo } from '@capacitor/device';
import { useToast } from '@/composables/useToast';
import { useNetworkStatus } from '@/composables/useNetworkStatus';
import { Preferences } from '@capacitor/preferences';

const { showToast } = useToast();

interface SEAKeyPair {
  pub: string;
  priv: string;
  epub: string;
  epriv: string;
  [key: string]: any;
}

export interface DeviceRecord {
  deviceId: string;
  model: string;
  os: string;
  osVersion: string;
  timestamp: number;
  isCurrent: boolean;
  isOnline: boolean;
}

export function useDeviceTracking(gun: any) {
  const talkFlowCore = getTalkFlowCore();
  const { currentUserPub, storageServ, decryptData } = talkFlowCore;
  const currentUserPair = ref<SEAKeyPair | null>(null);
  const currentDeviceId = ref<string>('');
  const currentDeviceInfo = ref<DeviceInfo | null>(null);
  const activeDevices = ref<DeviceRecord[]>([]);
  const historicalDevices = ref<DeviceRecord[]>([]);
  const keyPairRecoveryAttempted = ref(false);

  const { networkStatus, peersStatus, updateStatus } = useNetworkStatus(storageServ);

  function hasValidKeyPair() {
    const isValid = currentUserPair.value && currentUserPair.value.epub;
    console.log('Checking key pair validity:', isValid);
    return isValid;
  }

  async function getKeyPairFromCore() {
    try {
      const pair = await talkFlowCore.currentUserPair?.();
      if (pair) {
        console.log('Retrieved key pair from core - pub:', pair.pub, 'has epub:', !!pair.epub);
        currentUserPair.value = pair as SEAKeyPair;
        return true;
      }
      console.log('No key pair found in TalkFlowCore');
      return false;
    } catch (err) {
      console.error('Failed to get key pair from core:', err);
      return false;
    }
  }

  async function recoverKeyPairFromCredentials() {
    if (hasValidKeyPair() || keyPairRecoveryAttempted.value) {
      console.log('Key pair already valid or recovery attempted');
      return true;
    }

    keyPairRecoveryAttempted.value = true;
    console.log('Attempting to recover key pair from credentials...');

    try {
      if (await getKeyPairFromCore()) return true;

      const result = await storageServ.query(
        "SELECT value FROM credentials WHERE key = ?",
        ['userCredentials']
      );

      if (!result.values || result.values.length === 0) {
        console.log('No credentials found in database');
        showToast('No user credentials found', 'error');
        return false;
      }

      const credentialsData = result.values[0].value;
      console.log('Retrieved credentials from database');
      const credentials = JSON.parse(credentialsData);

      if (!credentials.encryptedKeyPair || !credentials.passphrase) {
        console.log('Credentials missing encryptedKeyPair or passphrase');
        showToast('Invalid user credentials', 'error');
        return false;
      }

      const keyPairString = decryptData(credentials.encryptedKeyPair, credentials.passphrase);
      if (!keyPairString) {
        console.log('Failed to decrypt key pair with passphrase');
        showToast('Failed to decrypt key pair', 'error');
        return false;
      }

      const keyPair = JSON.parse(keyPairString);
      if (!keyPair || !keyPair.epub) {
        console.log('Recovered key pair is invalid - missing epub or invalid structure');
        showToast('Invalid key pair recovered', 'error');
        return false;
      }

      currentUserPair.value = keyPair as SEAKeyPair;
      console.log('Successfully recovered key pair');
      return true;
    } catch (err) {
      console.error('Error recovering key pair:', err);
      showToast('Error recovering key pair', 'error');
      return false;
    }
  }

  async function initializeDeviceId(): Promise<void> {
    const { value } = await Preferences.get({ key: 'deviceId' });
    if (value) {
      currentDeviceId.value = value;
      console.log('Restored device ID:', value);
      return;
    }

    const info = await Device.getInfo();
    const platform = info.operatingSystem;

    if (platform === 'ios' || platform === 'android') {
      try {
        const { identifier } = await Device.getId();
        currentDeviceId.value = identifier;
        console.log('Got hardware ID:', identifier);
      } catch (err) {
        console.error('Failed to get hardware ID:', err);
        showToast('Cannot get device hardware ID', 'error');
        currentDeviceId.value = generateFallbackDeviceId();
      }
    } else {
      currentDeviceId.value = generateFallbackDeviceId();
      console.log('Generated fingerprint ID:', currentDeviceId.value);
    }

    await Preferences.set({ key: 'deviceId', value: currentDeviceId.value });
    console.log('Saved device ID:', currentDeviceId.value);
  }

  function generateFallbackDeviceId(): string {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform || 'unknown';
    const screen = `${window.screen.width}x${window.screen.height}`;
    const fingerprint = `${userAgent}-${platform}-${screen}`;

    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'web-' + Math.abs(hash).toString(36);
  }

  async function fetchDeviceInfo(): Promise<void> {
    try {
      const info = await Device.getInfo();
      currentDeviceInfo.value = info;
      console.log('Current device info:', info);
    } catch (err) {
      console.error('Failed to get device info:', err);
      showToast('Cannot get device info', 'warning');
    }
  }

  async function registerCurrentDeviceFallback() {
    if (!currentDeviceInfo.value || !currentDeviceId.value) {
      console.log('Cannot register fallback: missing device info or ID');
      return;
    }

    const timestamp = Date.now();
    const device: DeviceRecord = {
      deviceId: currentDeviceId.value,
      model: currentDeviceInfo.value.model || 'Unknown',
      os: currentDeviceInfo.value.operatingSystem || 'Unknown',
      osVersion: currentDeviceInfo.value.osVersion || 'Unknown',
      timestamp,
      isCurrent: true,
      isOnline: true,
    };

    const existingIndex = activeDevices.value.findIndex(d => d.deviceId === device.deviceId);
    if (existingIndex === -1) {
      activeDevices.value.push(device);
    } else {
      activeDevices.value[existingIndex] = device;
    }

    const historicalIndex = historicalDevices.value.findIndex(d => d.deviceId === device.deviceId);
    if (historicalIndex === -1) {
      historicalDevices.value.push(device);
    } else {
      historicalDevices.value[historicalIndex] = device;
    }

    activeDevices.value.sort((a, b) => b.timestamp - a.timestamp);
    historicalDevices.value.sort((a, b) => b.timestamp - a.timestamp);

    console.log('Registered current device as fallback:', device);
  }

  async function updateDeviceStatus(): Promise<void> {
    if (!currentUserPub.value || !currentDeviceInfo.value) {
      console.log('Missing user or device info, skipping update');
      await registerCurrentDeviceFallback();
      return;
    }

    if (!hasValidKeyPair()) {
      const recovered = await recoverKeyPairFromCredentials();
      if (!recovered) {
        console.log('Key pair recovery failed, using fallback');
        await registerCurrentDeviceFallback();
        return;
      }
    }

    const isOnline = true;
    const timestamp = Date.now();
    const deviceData = {
      model: currentDeviceInfo.value.model || 'Unknown',
      os: currentDeviceInfo.value.operatingSystem || 'Unknown',
      osVersion: currentDeviceInfo.value.osVersion || 'Unknown',
      timestamp,
      isOnline,
    };

    console.log('Updating device status:', {
      deviceId: currentDeviceId.value,
      ...deviceData,
    });

    try {
      const pair = currentUserPair.value as SEAKeyPair;
      const epub = pair.epub;
      const secret = await Gun.SEA.secret(epub, pair);
      if (!secret) {
        console.error('Failed to generate encryption key');
        showToast('Device data encryption failed', 'error');
        await registerCurrentDeviceFallback();
        return;
      }

      const encryptedData = await Gun.SEA.encrypt(deviceData, secret);
      gun.get('users').get(currentUserPub.value).get('devices').get(currentDeviceId.value).put(encryptedData);
      console.log(`Synced device status: ${currentDeviceId.value}`);

      const device: DeviceRecord = {
        deviceId: currentDeviceId.value,
        model: deviceData.model,
        os: deviceData.os,
        osVersion: deviceData.osVersion,
        timestamp: deviceData.timestamp,
        isCurrent: true,
        isOnline: deviceData.isOnline,
      };

      const existingIndex = activeDevices.value.findIndex(d => d.deviceId === device.deviceId);
      if (existingIndex === -1) {
        activeDevices.value.push(device);
      } else {
        activeDevices.value[existingIndex] = device;
      }

      const historicalIndex = historicalDevices.value.findIndex(d => d.deviceId === device.deviceId);
      if (historicalIndex === -1) {
        historicalDevices.value.push(device);
      } else {
        historicalDevices.value[historicalIndex] = device;
      }

      activeDevices.value.sort((a, b) => b.timestamp - a.timestamp);
      historicalDevices.value.sort((a, b) => b.timestamp - a.timestamp);

      console.log('Device lists updated:', {
        active: activeDevices.value.map(d => d.deviceId),
        historical: historicalDevices.value.map(d => d.deviceId),
      });
    } catch (err) {
      console.error('Failed to update device status:', err);
      showToast('Failed to update device status', 'error');
      await registerCurrentDeviceFallback();
    }
  }

  async function listenDevices(): Promise<void> {
    if (!currentUserPub.value) {
      console.log('User not logged in, skipping monitoring');
      await registerCurrentDeviceFallback();
      return;
    }

    if (!hasValidKeyPair()) {
      const recovered = await recoverKeyPairFromCredentials();
      if (!recovered) {
        console.log('Key pair recovery failed, skipping monitoring');
        await registerCurrentDeviceFallback();
        return;
      }
    }

    try {
      console.log('Starting device monitoring for pub:', currentUserPub.value);
      gun.get('users').get(currentUserPub.value).get('devices').map().on(async (encryptedData: any, deviceId: string) => {
        if (!encryptedData) {
          console.log(`Empty data for device: ${deviceId}`);
          return;
        }

        console.log(`Received data for device: ${deviceId}`);
        try {
          const pair = currentUserPair.value as SEAKeyPair;
          const epub = pair.epub;
          const secret = await Gun.SEA.secret(epub, pair);
          if (!secret) {
            console.log(`Failed to generate decryption key for device ${deviceId}`);
            return;
          }

          const decryptedData = await Gun.SEA.decrypt(encryptedData, secret);
          if (!decryptedData || !decryptedData.timestamp) {
            console.log(`Failed to decrypt data for device ${deviceId}`);
            return;
          }

          const device: DeviceRecord = {
            deviceId,
            model: decryptedData.model || 'Unknown',
            os: decryptedData.os || 'Unknown',
            osVersion: decryptedData.osVersion || 'Unknown',
            timestamp: decryptedData.timestamp,
            isCurrent: deviceId === currentDeviceId.value,
            isOnline: decryptedData.isOnline || false,
          };

          console.log(`Processed device:`, device);

          const now = Date.now();
          const isActive = now - device.timestamp < 2 * 60 * 60 * 1000;

          if (device.isCurrent) {
            device.isOnline = true;
          }

          if (isActive) {
            const existingIndex = activeDevices.value.findIndex(d => d.deviceId === deviceId);
            if (existingIndex === -1) {
              activeDevices.value.push(device);
              console.log(`Added to active: ${device.model} (${deviceId})`);
              if (!device.isCurrent) {
                showToast(`New device login: ${device.model}`, 'warning');
              }
            } else {
              activeDevices.value[existingIndex] = device;
              console.log(`Updated active: ${device.model} (${deviceId})`);
            }
          } else {
            activeDevices.value = activeDevices.value.filter(d => d.deviceId !== deviceId);
            console.log(`Removed inactive: ${device.model} (${deviceId})`);
          }

          const historicalIndex = historicalDevices.value.findIndex(d => d.deviceId === deviceId);
          if (historicalIndex === -1) {
            historicalDevices.value.push(device);
          } else {
            historicalDevices.value[historicalIndex] = device;
          }

          activeDevices.value.sort((a, b) => b.timestamp - a.timestamp);
          historicalDevices.value.sort((a, b) => b.timestamp - a.timestamp);

          console.log('Device lists:', {
            active: activeDevices.value.map(d => d.deviceId),
            historical: historicalDevices.value.map(d => d.deviceId),
          });
        } catch (err) {
          console.error(`Error processing device ${deviceId}:`, err);
        }
      });
      console.log('Device monitoring started');
    } catch (err) {
      console.error('Error setting up device monitoring:', err);
      showToast('Failed to start device monitoring', 'error');
      await registerCurrentDeviceFallback();
    }
  }

  async function initializeSync() {
    console.log('Initializing device sync...');
    await initializeDeviceId();
    await fetchDeviceInfo();
    await getKeyPairFromCore();
    await updateDeviceStatus();
    await listenDevices();
    console.log('Initial sync completed');
  }

  function handleNetworkChange() {
    updateStatus();
    updateDeviceStatus();
  }

  onMounted(async () => {
    await initializeSync();
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    setInterval(updateDeviceStatus, 5 * 60 * 1000);
  });

  onUnmounted(() => {
    window.removeEventListener('online', handleNetworkChange);
    window.removeEventListener('offline', handleNetworkChange);
  });

  return {
    currentDeviceId,
    currentDeviceInfo,
    activeDevices,
    historicalDevices,
    updateDeviceStatus,
    initializeSync,
  };
}

export default useDeviceTracking;