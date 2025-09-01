import { ref } from 'vue';
import { BiometricAuth, BiometryType, BiometryError, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

interface KeyPair {
  pub: string;
  priv: string;
  epub: string;
  epriv: string;
  alias?: string;
}

export function useFaceIDAuth() {
  const chatFlow = getTalkFlowCore();
  const { generateKeyPair, simpleLogin, showToast, storageServ } = chatFlow;

  // 状态管理
  const isProcessing = ref(false);
  const errorMessage = ref<string | null>(null);
  const isLoggedIn = ref(chatFlow.isLoggedIn.value);
  const currentUserPub = ref(chatFlow.currentUserPub.value);
  const currentUserAlias = ref(chatFlow.currentUserAlias.value);

  // 检查Face ID可用性
  async function isFaceIDAvailable(): Promise<boolean> {
    try {
      const result = await BiometricAuth.checkBiometry();
      const isBiometrySupported = result.isAvailable && (
        result.biometryType === BiometryType.faceId ||
        result.biometryType === BiometryType.touchId
      );
      if (!isBiometrySupported) {
        errorMessage.value = result.reason || 'Face ID或Touch ID不可用';
        showToast(errorMessage.value, 'error');
      }
      return isBiometrySupported;
    } catch (err) {
      const biometryError = err instanceof BiometryError ? err : new BiometryError('未知错误', BiometryErrorType.none);
      errorMessage.value = biometryError.message || '检查生物识别失败';
      showToast(errorMessage.value, 'error');
      console.error('Biometric check failed:', biometryError);
      return false;
    }
  }

  // 使用Face ID生成密钥对并存储到钥匙串
  async function generateKeyPairWithFaceID(alias: string): Promise<boolean> {
    if (isProcessing.value) return false;
    isProcessing.value = true;
    errorMessage.value = null;

    try {
      // Face ID验证
      await BiometricAuth.authenticate({
        reason: '请使用Face ID生成密钥对',
        cancelTitle: '取消',
        allowDeviceCredential: false,
        iosFallbackTitle: '',
      });

      // 设置别名并生成密钥对
      chatFlow.newAlias.value = alias;
      await generateKeyPair();

      if (!chatFlow.encryptedKeyPair.value) {
        errorMessage.value = chatFlow.generateMsg.value || '密钥对生成失败';
        showToast(errorMessage.value, 'error');
        isProcessing.value = false;
        return false;
      }

      // 存储到钥匙串
      await SecureStorage.set('userCredentials', chatFlow.encryptedKeyPair.value);

      // 保存到数据库
      const pair: KeyPair = JSON.parse(chatFlow.encryptedKeyPair.value);
      await storageServ.saveUser(pair.pub, alias, undefined, chatFlow.encryptedKeyPair.value);

      errorMessage.value = '密钥对生成成功并已保存';
      showToast(errorMessage.value, 'success');
      isProcessing.value = false;
      return true;
    } catch (err) {
      const biometryError = err instanceof BiometryError ? err : new BiometryError('未知错误', BiometryErrorType.none);
      errorMessage.value = biometryError.message || 'Face ID验证或密钥生成失败';
      if (biometryError.code === BiometryErrorType.biometryNotEnrolled) {
        errorMessage.value = '未设置Face ID或Touch ID，请在设备设置中启用';
      } else if (biometryError.code === BiometryErrorType.biometryNotAvailable) {
        errorMessage.value = '设备不支持Face ID或Touch ID';
      }
      showToast(errorMessage.value, 'error');
      console.error('Generate key pair error:', biometryError);
      isProcessing.value = false;
      return false;
    }
  }

  // 使用Face ID自动登录
  async function loginWithFaceID(): Promise<boolean> {
    if (isProcessing.value) return false;
    isProcessing.value = true;
    errorMessage.value = null;

    try {
      // Face ID验证
      await BiometricAuth.authenticate({
        reason: '请使用Face ID登录',
        cancelTitle: '取消',
        allowDeviceCredential: false,
        iosFallbackTitle: '',
      });

      // 从钥匙串读取加密密钥对
      let encrypted: any;
      try {
        const result = await SecureStorage.get('userCredentials');
        encrypted = result;
      } catch (err) {
        errorMessage.value = '未找到保存的密钥对';
        showToast(errorMessage.value, 'error');
        console.error('Secure storage get error:', err);
        isProcessing.value = false;
        return false;
      }

      // 执行登录
      await simpleLogin(encrypted);

      if (chatFlow.loginError.value) {
        errorMessage.value = chatFlow.loginError.value;
        showToast(errorMessage.value, 'error');
        isProcessing.value = false;
        return false;
      }

      // 更新状态
      isLoggedIn.value = chatFlow.isLoggedIn.value;
      currentUserPub.value = chatFlow.currentUserPub.value;
      currentUserAlias.value = chatFlow.currentUserAlias.value;

      errorMessage.value = '使用Face ID登录成功';
      showToast(errorMessage.value, 'success');
      isProcessing.value = false;
      return true;
    } catch (err) {
      const biometryError = err instanceof BiometryError ? err : new BiometryError('未知错误', BiometryErrorType.none);
      errorMessage.value = biometryError.message || 'Face ID登录失败';
      if (biometryError.code === BiometryErrorType.biometryNotEnrolled) {
        errorMessage.value = '未设置Face ID或Touch ID，请在设备设置中启用';
      } else if (biometryError.code === BiometryErrorType.biometryNotAvailable) {
        errorMessage.value = '设备不支持Face ID或Touch ID';
      }
      showToast(errorMessage.value, 'error');
      console.error('Login error:', biometryError);
      isProcessing.value = false;
      return false;
    }
  }

  // 从钥匙串清除密钥对
  async function clearKeyPair(): Promise<void> {
    try {
      await SecureStorage.remove('userCredentials');
      showToast('已从钥匙串清除密钥对', 'success');
    } catch (err) {
      errorMessage.value = '清除密钥对失败';
      showToast(errorMessage.value, 'error');
      console.error('Clear key pair error:', err);
    }
  }

  return {
    isFaceIDAvailable,
    generateKeyPairWithFaceID,
    loginWithFaceID,
    clearKeyPair,
    isProcessing,
    errorMessage,
    isLoggedIn,
    currentUserPub,
    currentUserAlias,
  };
}