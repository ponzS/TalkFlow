// composables/useDeviceTracking.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { Device, DeviceInfo } from '@capacitor/device';
import { useToast } from '@/composables/useToast';
import { useNetworkStatus } from '@/composables/useNetworkStatus';

import { Preferences } from '@capacitor/preferences';

const { showToast } = useToast();

// Define interface for SEA key pair
interface SEAKeyPair {
  pub: string;
  priv: string;
  epub: string;
  epriv: string;
  [key: string]: any; // For any additional properties
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

  // Helper function to check if we have a valid key pair
  function hasValidKeyPair() {
    return currentUserPair.value && currentUserPair.value.epub;
  }

  // Try to get key pair from TalkFlowCore
  async function getKeyPairFromCore() {
    try {
      const pair = await talkFlowCore.currentUserPair?.();
      if (pair) {
        console.log('Retrieved key pair from core');
        currentUserPair.value = pair as SEAKeyPair;
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to get key pair from core:', err);
      return false;
    }
  }

  // Try to recover key pair from credentials
  async function recoverKeyPairFromCredentials() {
    if (hasValidKeyPair() || keyPairRecoveryAttempted.value) return true;
    
    keyPairRecoveryAttempted.value = true;
    console.log('Attempting to recover key pair from credentials...');
    
    try {
      // First try to get it directly from TalkFlowCore
      if (await getKeyPairFromCore()) return true;
      
      // Then check credentials table
      const result = await storageServ.query(
        "SELECT * FROM credentials WHERE key = 'userCredentials'"
      );
      
      if (!result.values || result.values.length === 0) {
        console.log('No credentials found in database');
        return false;
      }
      
      const encryptedData = result.values[0].value;
      const decryptedData = decryptData(encryptedData, 'talkflow-secret-key');
      
      if (!decryptedData) {
        console.log('Failed to decrypt credentials');
        return false;
      }
      
      const credentials = JSON.parse(decryptedData);
      if (!credentials.encryptedKeyPair || !credentials.passphrase) {
        console.log('Credentials do not contain key pair or passphrase');
        return false;
      }
      
      // Decrypt the key pair with the stored passphrase
      const keyPairString = decryptData(credentials.encryptedKeyPair, credentials.passphrase);
      if (!keyPairString) {
        console.log('Failed to decrypt key pair with stored passphrase');
        return false;
      }
      
      // Parse and store the key pair
      const keyPair = JSON.parse(keyPairString);
      if (!keyPair || !keyPair.epub) {
        console.log('Recovered key pair is invalid');
        return false;
      }
      
      currentUserPair.value = keyPair as SEAKeyPair;
      console.log('Successfully recovered key pair from credentials');
      return true;
    } catch (err) {
      console.error('Error recovering key pair:', err);
      return false;
    }
  }

  // 生成或恢复设备 ID
  async function initializeDeviceId(): Promise<void> {
    const { value } = await Preferences.get({ key: 'deviceId' });
    if (value) {
      currentDeviceId.value = value;
      console.log('Restored device ID:', value);
      return;
    }

    // 获取设备信息判断平台
    const info = await Device.getInfo();
    const platform = info.operatingSystem; // 'ios', 'android', 'web' 等

    if (platform === 'ios' || platform === 'android') {
      // 原生平台使用硬件 UUID
      try {
        const { identifier } = await Device.getId();
        currentDeviceId.value = identifier;
        console.log('Got hardware ID from Device.getId:', identifier);
      } catch (err) {
        console.error('Failed to get hardware ID:', err);
        showToast('Cannot get device hardware ID', 'error');
        currentDeviceId.value = generateFallbackDeviceId(); // 回退方案
      }
    } else {
      // Web 平台使用设备指纹
      currentDeviceId.value = generateFallbackDeviceId();
      console.log('Generated fingerprint ID for web platform:', currentDeviceId.value);
    }

    await Preferences.set({ key: 'deviceId', value: currentDeviceId.value });
    console.log('Saved device ID:', currentDeviceId.value);
  }

  // Web 平台的回退方案：基于设备信息生成稳定 ID
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

  async function updateDeviceStatus(): Promise<void> {
    if (!currentUserPub.value || !currentDeviceInfo.value) {
      console.log('User not logged in or device info missing, skipping device status update');
      return;
    }

    // Try to recover key pair if needed
    if (!hasValidKeyPair()) {
      const recovered = await recoverKeyPairFromCredentials();
      if (!recovered) {
        console.log('Key pair recovery failed, skipping device status update');
        return;
      }
    }

    // Always consider current device as online when updating
    const isOnline = true; 
    const timestamp = Date.now();
    const deviceData = {
      model: currentDeviceInfo.value.model || 'Unknown',
      os: currentDeviceInfo.value.operatingSystem || 'Unknown',
      osVersion: currentDeviceInfo.value.osVersion || 'Unknown',
      timestamp,
      isOnline, // Force current device to be online
    };

    console.log('Updating device status:', {
      deviceId: currentDeviceId.value,
      ...deviceData,
      networkStatus: networkStatus.value,
      peersStatus: peersStatus.value
    });

    try {
      const pair = currentUserPair.value as SEAKeyPair;
      const epub = pair.epub;
      const secret = await Gun.SEA.secret(epub, pair);
      if (!secret) {
        console.error('Failed to generate encryption key');
        showToast('Device data encryption failed', 'error');
        return;
      }

      const encryptedData = await Gun.SEA.encrypt(deviceData, secret);
      gun.get('users').get(currentUserPub.value).get('devices').get(currentDeviceId.value).put(encryptedData);
      console.log(`Encrypted and synced device status: ${currentDeviceId.value}`);
      
      // Update local device list immediately
      const device: DeviceRecord = {
        deviceId: currentDeviceId.value,
        model: deviceData.model,
        os: deviceData.os,
        osVersion: deviceData.osVersion,
        timestamp: deviceData.timestamp,
        isCurrent: true,
        isOnline: deviceData.isOnline,
      };
      
      // Add or update in active devices
      const existingIndex = activeDevices.value.findIndex(d => d.deviceId === currentDeviceId.value);
      if (existingIndex === -1) {
        activeDevices.value.push(device);
      } else {
        activeDevices.value[existingIndex] = device;
      }
      
      // Ensure also in historical devices
      const historicalIndex = historicalDevices.value.findIndex(d => d.deviceId === currentDeviceId.value);
      if (historicalIndex === -1) {
        historicalDevices.value.push(device);
      } else {
        historicalDevices.value[historicalIndex] = device;
      }
      
      // Sort lists
      activeDevices.value.sort((a, b) => b.timestamp - a.timestamp);
      historicalDevices.value.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log('Local device lists updated:', {
        activeCount: activeDevices.value.length,
        historicalCount: historicalDevices.value.length
      });
    } catch (err) {
      console.error('Failed to update device status:', err);
    }
  }

  async function listenDevices(): Promise<void> {
    if (!currentUserPub.value) {
      console.log('User not logged in, skipping device monitoring');
      return;
    }

    // Try to recover key pair if needed
    if (!hasValidKeyPair()) {
      const recovered = await recoverKeyPairFromCredentials();
      if (!recovered) {
        console.log('Key pair recovery failed, skipping device monitoring');
        return;
      }
    }

    try {
      console.log('Starting device monitoring...');
      gun.get('users').get(currentUserPub.value).get('devices').map().on(async (encryptedData: any, deviceId: string) => {
        if (!encryptedData) {
          console.log(`Received empty data for device: ${deviceId}`);
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

          console.log(`Processed device data:`, device);

          const now = Date.now();
          // Consider active if updated in the last 2 hours (increased from 30 minutes)
          const isActive = now - device.timestamp < 2 * 60 * 60 * 1000;
          
          // For current device, always consider it active and online
          if (device.isCurrent) {
            device.isOnline = true;
          }

          if (isActive) {
            const existingIndex = activeDevices.value.findIndex(d => d.deviceId === deviceId);
            if (existingIndex === -1) {
              activeDevices.value.push(device);
              console.log(`Added device to active list: ${device.model} (${deviceId})`);
              if (!device.isCurrent) {
                showToast(`New device login detected: ${device.model}`, 'warning');
              }
            } else {
              activeDevices.value[existingIndex] = device;
              console.log(`Updated device in active list: ${device.model} (${deviceId})`);
            }
          } else {
            const removed = activeDevices.value.find(d => d.deviceId === deviceId);
            if (removed) {
              console.log(`Removed inactive device: ${removed.model} (${deviceId})`);
            }
            activeDevices.value = activeDevices.value.filter(d => d.deviceId !== deviceId);
          }

          const historicalIndex = historicalDevices.value.findIndex(d => d.deviceId === deviceId);
          if (historicalIndex === -1) {
            historicalDevices.value.push(device);
          } else {
            historicalDevices.value[historicalIndex] = device;
          }

          activeDevices.value.sort((a, b) => b.timestamp - a.timestamp);
          historicalDevices.value.sort((a, b) => b.timestamp - a.timestamp);
          
          console.log('Device lists updated:', {
            activeCount: activeDevices.value.length,
            historicalCount: historicalDevices.value.length
          });
        } catch (err) {
          console.error(`Error processing device ${deviceId}:`, err);
        }
      });
      console.log('Device monitoring started successfully');
    } catch (err) {
      console.error('Error setting up device monitoring:', err);
    }
  }

  function handleNetworkChange() {
    updateStatus();
    updateDeviceStatus();
  }

  onMounted(async () => {
    await initializeDeviceId();
    await fetchDeviceInfo();
    
    // Initial attempt to get key pair from core
    await getKeyPairFromCore();
    
    await updateDeviceStatus();
    await listenDevices();
    
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    
    // Periodic updates
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
  };
}

export default useDeviceTracking;

