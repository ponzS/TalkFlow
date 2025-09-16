import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BrowserQRCodeReader } from '@zxing/browser';
// import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { Browser } from '@capacitor/browser';
// import { imageOutline } from 'ionicons/icons';

const router = useRouter();
// const chatFlowStore = getTalkFlowCore();
// const { searchUserProfile, buddyList } = chatFlowStore;


const isOpenScanner = ref(false);

const scanning = ref(false);
const isSearching = ref(false);
const scannedData = ref<string | null>(null);
const errorMsg = ref<string | null>(null);
const photoSrc = ref<string | null>(null);
const showOverlay = ref(true);

// 模态窗口状态
const modalContent = ref<string | null>(null);
const modalType = ref<'error' | 'text' | 'http-confirm' | null>(null);

// 常见 TLD 列表（可扩展）
const tldList = [
  '.com', '.org', '.net', '.edu', '.gov', '.mil', '.biz', '.info', '.co', '.io', '.me', '.tv', '.us', '.uk', '.de', 
  '.fr', '.jp', '.cn', '.ru', '.br', '.au', '.ca', '.in', '.it', '.es', '.mx', '.nl', '.se', '.no', '.ch', '.kr', 
  '.tw', '.za', '.nz', '.sg', '.hk', '.eu', '.online', '.site', '.store', '.tech', '.app', '.dev', '.xyz', '.club', 
  '.shop', '.blog', '.live', '.work', '.world', '.pro', '.name', '.mobi', '.email', '.solutions', '.guru'
];

async function checkBarcodePermission() {
  const status = await BarcodeScanner.checkPermission({ force: true });
  if (status.granted) return true;
  if (status.denied) {
    alert('The camera permission has been rejected.if you need,try agin please.');
    return false;
  }
  return false;
}

async function startRealtimeScan() {
  resetState();
  const hasPermission = await checkBarcodePermission();
  if (!hasPermission) return;

  try {
    scanning.value = true;
    document.body.classList.add('scanner-active');
    await BarcodeScanner.hideBackground();
    const result = await BarcodeScanner.startScan();
    if (result.hasContent) {
      scannedData.value = result.content;
      await handleScanResult(result.content);
    }
  } catch (err: any) {
    scanning.value = false;
    await BarcodeScanner.showBackground();
    document.body.classList.remove('scanner-active');
    showModal('error', err?.message || 'error about scanner');
  }
}

async function stopRealtimeScanAndGoBack() {
  await stopRealtimeScan();
  router.go(-1);
}

async function stopRealtimeScan() {
  scanning.value = false;
  await BarcodeScanner.showBackground();
  await BarcodeScanner.stopScan();
  document.body.classList.remove('scanner-active');
}

async function pickPhoto() {
  resetState();

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      allowEditing: false,
    });

    if (photo?.dataUrl) {
      photoSrc.value = photo.dataUrl;
      await decodeQrFromDataUrl(photo.dataUrl);
    }
  } catch (err: any) {
    showModal('error', err?.message || 'error about photo');
  }
}

async function decodeQrFromDataUrl(dataUrl: string) {
  try {
    const codeReader = new BrowserQRCodeReader();
    const result = await codeReader.decodeFromImageUrl(dataUrl);
    scannedData.value = result.getText();
    await handleScanResult(result.getText());
  } catch (err: any) {
    showModal('error', `Unable to parse the QR code：${err?.message || err}`);
  }
}

async function handleScanResult(content: string) {
  if (isPotentialPublicKey(content)) {
    await handlePublicKey(content);
  } else if (isValidHttpUrl(content)) {
    await handleUrl(content);
  } else if (isPotentialDomain(content)) {
    await tryOpenDomain(content);
  } else {
    showModal('text', content);
  }
}

function isValidHttpUrl(text: string) {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function isPotentialPublicKey(text: string) {
  return text.startsWith('pubkey:');
}

function isPotentialDomain(text: string) {
  const lowerText = text.toLowerCase();
  return tldList.some(tld => lowerText.endsWith(tld));
}

async function handlePublicKey(content: string) {
  const pub = content.replace('pubkey:', '');
  isSearching.value = true;
  try {
    const userExists = await getTalkFlowCore().searchUserProfile(pub);
    if (userExists) {
      const isFriend = getTalkFlowCore().buddyList.value.some(b => b.pub === pub);
      if (isFriend) {
        router.push({ path: '/friend-profile', query: { pub } });
      } else {
        router.push({ path: '/stranger-profile', query: { pub } });
      }
    } else {
      showModal('error', 'No user');
    }
  } catch (err) {
    showModal('error', 'check you net please');
    // console.error('搜索用户失败:', err);
  } finally {
    isSearching.value = false;
  }
}

async function handleUrl(content: string) {
  const url = new URL(content);
  if (url.protocol === 'https:') {
    await openUrlInBrowser(content);
  } else if (url.protocol === 'http:') {
    showModal('http-confirm', content);
  }
}

async function tryOpenDomain(domain: string) {
  const httpsUrl = `https://${domain}`;
  const httpUrl = `http://${domain}`;

  try {
    await fetch(httpsUrl, { method: 'HEAD', mode: 'no-cors' });
    await openUrlInBrowser(httpsUrl);
  } catch (httpsErr) {
    try {
      await fetch(httpUrl, { method: 'HEAD', mode: 'no-cors' });
      showModal('http-confirm', httpUrl);
    } catch (httpErr) {
      showModal('error', `${domain} Unable to access (HTTPS and HTTP)`);
      console.error('Domain access failed:', httpErr);
    }
  }
}

async function openUrlInBrowser(url: string) {
  try {
    await Browser.open({ url });
    resetState();
  } catch (err) {
    showModal('error', 'open failed');
    console.error('Browser open failed:', err);
  }
}

// 模态窗口控制
function showModal(type: 'error' | 'text' | 'http-confirm', content: string) {
  modalType.value = type;
  modalContent.value = content;
}

function closeModal() {
  modalContent.value = null;
  modalType.value = null;
}

async function confirmHttpOpen() {
  if (modalType.value === 'http-confirm' && modalContent.value) {
    await openUrlInBrowser(modalContent.value);
  }
  closeModal();
}

function resetState() {
  scannedData.value = null;
  errorMsg.value = null;
  photoSrc.value = null;
  closeModal();
}



export function openScanner() {
    document.body.style.backgroundColor = 'transparent';
    setTimeout(() => {
      showOverlay.value = false;
    }, 1000);
    startRealtimeScan();
}
export function closeScanner() {
    document.body.style.backgroundColor = '';
  stopRealtimeScan();
}

export function openOrClose() {
    isOpenScanner.value = !isOpenScanner.value;
    // if (isOpenScanner.value) {
    //     openScanner();
    // } else {
    //     closeScanner();
    // }
}

export function useScanner() {
    return {
        isOpenScanner,
        openScanner,
        closeScanner,
        openOrClose,

    }
}