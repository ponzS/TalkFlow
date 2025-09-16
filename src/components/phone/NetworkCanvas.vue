<template>
  <div class="network-canvas-container">
    <!-- 文字封面 -->
    <div v-if="showCover" class="mesh-cover" @click="showCanvas">
      <div class="cover-content">
        <h1 class="mesh-title">Mesh Network</h1>
        <div class="loading-indicator">
          <div v-if="isDataLoading" class="loading-dots">
            <span></span><span></span><span></span>
          </div>
          <p class="loading-text">
            {{ isDataLoading ? $t('loadingNetworkData', 'Loading network data...') : $t('clickToView', 'Click to view network') }}
          </p>
        </div>
        <!-- <div v-if="!isDataLoading" class="ready-hint">
          <ion-icon :icon="playCircleOutline" class="play-icon"></ion-icon>
        </div> -->
      </div>
    </div>
    
    <!-- 3D网络拓扑图 -->
    <canvas ref="networkCanvasRef" class="network-canvas" :style="{ display: showCover ? 'none' : 'block' }"></canvas>
    
    <!-- 图例面板 -->
    <div v-if="isLegendVisible" class="legend-panel">
      <div class="legend-title">{{ $t('legendTitle') }}</div>
      <ul>
        <li v-for="item in legendItems" :key="item.label">
          <span class="legend-color-dot" :style="{ backgroundColor: item.color }"></span>
          {{ $t(item.label) }}
        </li>
      </ul>
    </div>
    
    <!-- 控制按钮 -->
    <!-- <div class="canvas-buttons">
      <ion-button 
        @click="toggleLegend" 
        fill="clear" 
        class="legend-button"
        :title="$t('toggleLegend')"
      >
        <ion-icon :icon="helpCircleOutline"></ion-icon>
      </ion-button>
      
      <ion-button 
        @click="toggleRelaySharingStatus" 
        fill="clear" 
        class="relay-sharing-button"
        :title="$t('toggleRelaySharing')"
      >
        <ion-icon :icon="isRelaySharingEnabled ? shareOutline : closeCircleSharp"></ion-icon>
      </ion-button>
      
      <ion-button 
        @click="isStrangerRelayModalOpen = true" 
        fill="clear" 
        class="stranger-list-button"
        :title="$t('viewStrangerRelays')"
      >
        <ion-icon :icon="cloudDownloadOutline"></ion-icon>
      </ion-button>
      
      <ion-button 
        @click="refreshCanvas" 
        fill="clear" 
        class="refresh-canvas-button"
        :title="$t('refreshCanvas')"
      >
        <ion-icon :icon="refreshOutline"></ion-icon>
      </ion-button>
    </div> -->
    

    
    <!-- 陌生节点模态窗口 -->
    <ion-modal
      :is-open="isStrangerRelayModalOpen"
      css-class="stranger-relay-modal"
      @didDismiss="isStrangerRelayModalOpen = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ $t('strangerRelaysTitle') }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="shareMyRelaysToFriends" fill="clear">
              <ion-icon :icon="cloudDownloadOutline"></ion-icon>
            </ion-button>
            <ion-button @click="isStrangerRelayModalOpen = false">
              <ion-icon :icon="closeCircleSharp"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div v-if="strangerRelaysList.length === 0" class="empty-state">
          <p>{{ $t('noStrangerRelays') }}</p>
          <ion-button @click="shareMyRelaysToFriends" fill="outline">
            <ion-icon :icon="cloudDownloadOutline" slot="start"></ion-icon>
            {{ $t('shareMyRelays') }}
          </ion-button>
        </div>
        <ion-list v-else>
          <ion-item v-for="url in strangerRelaysList" :key="url" class="relay-item">
            <ion-label class="relay-url">{{ url }}</ion-label>
            <ion-button slot="end" fill="clear" @click="handleAddStrangerRelay(url)">
              <ion-icon :icon="addCircleOutline"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNetworkStatus } from '@/composables/useNetworkStatus';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';

// 定义事件发射器
const emit = defineEmits<{
  viewModeChanged: [isPersonalView: boolean]
}>();
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { Raycaster, Vector2 } from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import * as CANNON from 'cannon-es';
import {
  IonButton,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/vue';
import {
  refreshOutline,
  helpCircleOutline,
  cloudDownloadOutline,
  closeCircleSharp,
  addCircleOutline,
  shareOutline,
  playCircleOutline
} from 'ionicons/icons';

const { t } = useI18n();
const chatFlowStore = getTalkFlowCore();
const {
  currentUserPub,
  currentUserAlias,
  buddyList,
  gun,
  showToast,
  storageServ,
  toggleRelaySharing,
  isRelaySharingEnabled
} = chatFlowStore;

// 直接调用 useNetworkStatus 获取最新的网络状态
const { peersList, peerStatuses, addPeer, enabledPeers } = useNetworkStatus(storageServ);

// 新增：好友和共享节点的状态
const friendsRelays = ref<Record<string, string[]>>({});
const friendListeners: Record<string, any> = {};

// 新增：陌生节点模态窗口状态
const isStrangerRelayModalOpen = ref(false);
const strangerRelaysList = ref<string[]>([]);

// 新增：图例状态
const isLegendVisible = ref(false);
const legendItems = ref([
  { color: '#9370DB', label: 'You' },
  { color: '#00BFFF', label: 'Friend' },
  { color: '#00FF00', label: 'MyConnectedRelay' },
  { color: '#808080', label: 'MyDisconnectedRelay' },
  { color: '#FF0000', label: 'MyErrorRelay' },
  { color: '#FFFF00', label: 'FriendSharedRelay' },
]);

// 新增：封面和数据加载状态
const showCover = ref(true);
const isDataLoading = ref(false);
const isCanvasReady = ref(false);
const preloadedData = ref<any>(null);
let dataStableTimer: ReturnType<typeof setTimeout> | null = null;
let lastDataUpdateTime = 0;

// 新增：视图模式状态
const isPersonalView = ref(false); // false为个人图，true为全部图
let allNodeSphere: THREE.Mesh | null = null; // All节点的引用
const animatingNodes = new Set<string>(); // 正在动画的节点集合

// 新增：自定义群组状态
const customGroups = ref<Record<string, any>>({});
const groupNodes = ref<Record<string, THREE.Mesh>>({});

// 新增：节点位置缓存，用于保持节点位置稳定
const nodePositions = new Map<string, THREE.Vector3>();
const nodeVelocities = new Map<string, CANNON.Vec3>();

const toggleLegend = () => {
  isLegendVisible.value = !isLegendVisible.value;
};

// 新增：切换视图模式
const toggleViewMode = () => {
  isPersonalView.value = !isPersonalView.value;
  createNetworkGraph();
};

// 新增：处理All节点点击事件
const handleAllNodeClick = () => {
  if (!isPersonalView.value) {
    // 从个人图切换到全部图
    isPersonalView.value = true;
    
    // 通知父组件更新toggle状态
    emit('viewModeChanged', isPersonalView.value);
    
    createNetworkGraphWithAnimation();
  }
};

// 新增：带动画的网络图创建
const createNetworkGraphWithAnimation = () => {
  if (!scene || !networkGroup || !world) {
  //  console.error('Three.js scene not ready');
    return;
  }
  
  // 先创建全部图的节点（但隐藏）
  createNetworkGraph();
  
  // 找到All节点的位置作为动画起点
  const allNodePosition = allNodeSphere ? allNodeSphere.position.clone() : new THREE.Vector3(3, 0, 0);
  
  // 为新出现的节点添加弹出动画
  networkGroup.children.forEach((child) => {
    if (child instanceof THREE.Mesh && child !== allNodeSphere && child.userData.isNewNode) {
      // 设置初始位置为All节点位置
      const targetPosition = child.position.clone();
      child.position.copy(allNodePosition);
      child.scale.set(0.1, 0.1, 0.1);
      
      // 创建弹出动画
      const animationDuration = 800 + Math.random() * 400; // 800-1200ms随机延迟
      const startTime = Date.now() + Math.random() * 300; // 0-300ms随机延迟
      
      const animateNode = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < 0) {
          requestAnimationFrame(animateNode);
          return;
        }
        
        const progress = Math.min(elapsed / animationDuration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        
        // 位置动画
        child.position.lerpVectors(allNodePosition, targetPosition, easeProgress);
        
        // 缩放动画
        const scale = 0.1 + (1 - 0.1) * easeProgress;
        child.scale.set(scale, scale, scale);
        
        if (progress < 1) {
          requestAnimationFrame(animateNode);
        } else {
          // 动画完成，更新物理体位置
          const nodeKey = child.userData.nodeKey;
          if (nodeKey && nodeBodies.has(nodeKey)) {
            const body = nodeBodies.get(nodeKey)!;
            body.position.copy(child.position as any);
          }
          animatingNodes.delete(child.userData.nodeKey || '');
        }
      };
      
      animatingNodes.add(child.userData.nodeKey || '');
      requestAnimationFrame(animateNode);
    }
  });
};

// 显示Canvas
const showCanvas = async () => {
  //console.log('User clicked to show canvas, starting initialization...');
  
  try {
    // 1. 立即停止加载状态，显示canvas
    isDataLoading.value = false;
    showCover.value = false;
    
    // 2. 准备canvas（如果还没准备好）
    if (!isCanvasReady.value) {
      await prepareCanvas();
    }
    
    // 3. 设置监听器开始收集数据
    setupFriendListeners();
    
    // 4. 预载数据
    preloadData();
    
    // 5. 加载自定义群组配置
    loadCustomGroups();
    
    // 5. 等待一小段时间让数据稳定，然后创建网络图
    setTimeout(() => {
      if (isCanvasReady.value) {
        // console.log('Creating network graph with data:', {
        //   buddyListLength: buddyList.value.length,
        //   peersListLength: peersList.value.length,
        //   friendsRelaysKeys: Object.keys(friendsRelays.value).length
        // });
        createNetworkGraph();
      }
    }, 500);
    
   // console.log('Canvas initialization completed');
  } catch (error) {
    //console.error('Failed to initialize canvas:', error);
    isDataLoading.value = false;
    showCover.value = false;
  }
};

// 加载自定义群组配置
const loadCustomGroups = () => {
  try {
    const savedGroups = localStorage.getItem('relay_groups');
    if (savedGroups) {
      customGroups.value = JSON.parse(savedGroups);
     // console.log('Loaded custom groups:', customGroups.value);
    }
  } catch (error) {
   // console.error('Error loading custom groups:', error);
  }
};

// 获取启用的群组
const getEnabledGroups = () => {
  const enabledGroups: Record<string, any> = {};
  Object.entries(customGroups.value).forEach(([groupName, groupData]: [string, any]) => {
    if (groupData.enabled) {
      enabledGroups[groupName] = groupData;
    }
  });
  return enabledGroups;
};

// 准备Canvas（预载数据后初始化）
const prepareCanvas = async () => {
  if (isCanvasReady.value) return;
  
  try {
    await nextTick();
    initThreeScene();
    isCanvasReady.value = true;
  } catch (error) {
    //console.error('Failed to prepare canvas:', error);
  }
};

// 数据更新处理
const handleDataUpdate = () => {
 // console.log('Data update triggered, processing...');
  
  lastDataUpdateTime = Date.now();
  
  // 清除之前的定时器
  if (dataStableTimer) {
    clearTimeout(dataStableTimer);
    dataStableTimer = null;
  }
  
  // 设置新的定时器，检查数据是否稳定
  dataStableTimer = setTimeout(() => {
    const now = Date.now();
    if (now - lastDataUpdateTime >= 100) {
      // 数据已稳定，停止加载状态
      isDataLoading.value = false;
      // 预载数据
      preloadData();
    //  console.log('Data stabilized, loading completed');
    }
  }, 100);
};

// 预载数据
const preloadData = () => {
  // 收集所有需要的数据
  preloadedData.value = {
    userPub: currentUserPub.value,
    userAlias: currentUserAlias.value,
    peers: [...peersList.value],
    buddies: [...buddyList.value],
    friendsRelays: { ...friendsRelays.value },
    peerStatuses: { ...peerStatuses.value }
  };
};

// three.js 相关的引用和状态
const networkCanvasRef = ref<HTMLCanvasElement | null>(null);
let renderer: THREE.WebGLRenderer | null = null;
let labelRenderer: CSS2DRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let dragControls: (DragControls & { dragging?: boolean }) | null = null;
let animationFrameId: number;
const networkGroup = new THREE.Group();
let intervalId: ReturnType<typeof setInterval> | undefined;

// Physics world
let world: CANNON.World | null = null;
let spherePhysMaterial: CANNON.Material | null = null; // For collision
const nodeBodies = new Map<string, CANNON.Body>(); // Map from pub/url to CANNON.Body
const nodeMeshes = new Map<string, THREE.Mesh>();
const draggableObjects: THREE.Mesh[] = [];

// 刷新Canvas
const refreshCanvas = () => {
  cleanupThreeScene();
  // 使用一个短暂的延迟确保资源完全释放
  setTimeout(() => {
    initThreeScene();
    // 可以在这里向用户显示一个提示
    showToast(t('canvasRefreshed', 'Canvas Refreshed'), 'success');
  }, 100);
};

// 初始化 Three.js 场景
const initThreeScene = () => {
  if (!networkCanvasRef.value) return;

  // 1. 渲染器
  renderer = new THREE.WebGLRenderer({
    canvas: networkCanvasRef.value,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(networkCanvasRef.value.clientWidth, networkCanvasRef.value.clientHeight);

  // 初始化 CSS2DRenderer (for labels)
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(networkCanvasRef.value.clientWidth, networkCanvasRef.value.clientHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.pointerEvents = 'none'; // Allow clicking through labels to canvas
  networkCanvasRef.value.parentElement?.insertBefore(labelRenderer.domElement, networkCanvasRef.value.nextSibling);

  // 2. 场景
  scene = new THREE.Scene();
  scene.add(networkGroup);

  // 3. 相机
  camera = new THREE.PerspectiveCamera(
    50,
    networkCanvasRef.value.clientWidth / networkCanvasRef.value.clientHeight,
    0.1,
    1000
  );
  camera.position.z = 20;
  camera.position.y = 4; // 将相机向上移动，使场景在可视区域内居中

  // 4. 光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // 增强环境光
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // 增强方向光
  directionalLight.position.set(0, 10, 5); // 从更上方照射
  scene.add(directionalLight);
  
  // 5. 控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 5;
  controls.maxDistance = 50;

  // 6. 初始化物理世界
  initPhysics();

  // 7. 创建网络图
  createNetworkGraph();

  // 8. 设置拖拽控件
  setupDragControls();

  // 9. 动画循环
  animate();

  // 10. 响应式处理
  window.addEventListener('resize', onWindowResize);

  // 11. 点击事件监听
  networkCanvasRef.value.addEventListener('click', onCanvasClick);
};

const initPhysics = () => {
  world = new CANNON.World();
  world.gravity.set(0, 0, 0); // No gravity
  world.broadphase = new CANNON.NaiveBroadphase();
  (world.solver as CANNON.GSSolver).iterations = 10;

  // Define a material for the spheres for collision
  spherePhysMaterial = new CANNON.Material('sphere');
  const sphereContactMaterial = new CANNON.ContactMaterial(
    spherePhysMaterial,
    spherePhysMaterial,
    {
      restitution: 0.8, // Bounciness
      friction: 0.1,
    }
  );
  world.addContactMaterial(sphereContactMaterial);
};

// 创建网络图
const createNetworkGraph = () => {
  if (!scene || !networkGroup || !world) {
   // console.error('Three.js scene not ready');
    return;
  }
  
  // 验证必要的数据是否存在
  if (!currentUserPub.value) {
  //  console.error('Current user pub not available');
    //showToast('用户数据未准备好，请稍后重试', 'error');
    return;
  }
  
  // console.log('Creating network graph with:', {
  //   userPub: currentUserPub.value?.slice(0, 8),
  //   buddyCount: buddyList.value.length,
  //   peersCount: peersList.value.length,
  //   friendsRelaysCount: Object.keys(friendsRelays.value).length,
  //   viewMode: isPersonalView.value ? 'personal' : 'full'
  // });

  // 保存当前节点位置和速度
  nodeMeshes.forEach((mesh, nodeKey) => {
    if (mesh && mesh.position) {
      nodePositions.set(nodeKey, mesh.position.clone());
    }
  });
  
  nodeBodies.forEach((body, nodeKey) => {
    if (body && body.velocity) {
      nodeVelocities.set(nodeKey, body.velocity.clone());
    }
  });

  // 清理旧对象
  // 1. 清理物理世界中的约束和刚体
  if (world) {
    // 清理所有约束
    const constraintsToRemove = [...world.constraints];
    constraintsToRemove.forEach(constraint => world.removeConstraint(constraint));
    
    // 清理所有刚体
    const bodiesToRemove = [...world.bodies];
    bodiesToRemove.forEach(body => world.removeBody(body));
    

  }
  
  // 2. 清理CSS2D标签 - 更彻底的清理机制
  if (labelRenderer && labelRenderer.domElement) {
    // 清理labelRenderer DOM元素中的所有子元素
    while (labelRenderer.domElement.firstChild) {
      labelRenderer.domElement.removeChild(labelRenderer.domElement.firstChild);
    }
  }
  
  // 遍历networkGroup中的所有对象并移除其标签
  networkGroup.traverse((child) => {
    if (child.children) {
      // 移除所有CSS2DObject子对象
      const css2dObjects = child.children.filter(c => c.type === 'CSS2DObject');
      css2dObjects.forEach(css2dObj => {
        child.remove(css2dObj);
        // 如果CSS2D对象有DOM元素，也要从DOM中移除
        if ((css2dObj as any).element && (css2dObj as any).element.parentNode) {
          (css2dObj as any).element.parentNode.removeChild((css2dObj as any).element);
        }
      });
    }
  });
  
  // 3. 清理3D对象
  networkGroup.clear();
  draggableObjects.length = 0;
  nodeBodies.clear();
  nodeMeshes.clear();
  

  
  // --- 节点数据收集 ---
  const allRelays = new Map<string, { sharedBy: Set<string> }>();
  
  // 获取所有好友的公钥列表
  const allFriendPubs = buddyList.value.map(buddy => buddy.pub);
  
  // 1. 添加自己的节点
  peersList.value.forEach(url => {
    if (!allRelays.has(url)) allRelays.set(url, { sharedBy: new Set() });
    allRelays.get(url)!.sharedBy.add(currentUserPub.value!); // Mark as shared by current user
  });


  // 2. 添加好友共享的节点（仅限通讯录好友）
  for (const friendPub in friendsRelays.value) {
    // 只处理通讯录中的好友
    if (!allFriendPubs.includes(friendPub)) {
      continue; // 跳过不在通讯录中的用户
    }
    
    const relays = friendsRelays.value[friendPub];
    if (relays && Array.isArray(relays)) {
      relays.forEach(url => {
        if (!allRelays.has(url)) allRelays.set(url, { sharedBy: new Set() });
        allRelays.get(url)!.sharedBy.add(friendPub); // Mark as shared by friend
      });
    }
  }


  // --- 3D对象创建 ---
  const radius = 5;
  let relayIndex = 0;

  // 1. 创建用户球体和物理实体
  const userSphere = createSphere(0.5, 0x9370DB); // 紫色
  
  // 恢复用户节点的保存位置，如果没有保存位置则使用默认位置
  const savedUserPosition = nodePositions.get(currentUserPub.value!);
  if (savedUserPosition) {
    userSphere.position.copy(savedUserPosition);
  } else {
    userSphere.position.set(0, 0, 0);
  }
  
  userSphere.userData.nodeKey = currentUserPub.value;
  networkGroup.add(userSphere);
  // The user's sphere is no longer draggable
  // draggableObjects.push(userSphere);

  const userShape = new CANNON.Sphere(0.5);
  // Mass = 0 makes the body static and immovable
  const userBodyInstance = new CANNON.Body({ mass: 0, shape: userShape, material: spherePhysMaterial });
  userBodyInstance.position.copy(userSphere.position as any);
  
  // 恢复用户节点的保存速度
  const savedUserVelocity = nodeVelocities.get(currentUserPub.value!);
  if (savedUserVelocity) {
    userBodyInstance.velocity.copy(savedUserVelocity);
  }
  
  userBodyInstance.linearDamping = 0.8;
  userBodyInstance.angularDamping = 0.9;
  world.addBody(userBodyInstance);
    nodeMeshes.set(currentUserPub.value, userSphere);
    nodeBodies.set(currentUserPub.value, userBodyInstance);


  // Create CSS2DObject for user's alias
  const userLabelDiv = document.createElement('div');
  userLabelDiv.className = 'user-label';
  userLabelDiv.textContent = currentUserAlias.value || 'You';
  const userLabel = new CSS2DObject(userLabelDiv);
  userLabel.position.set(0, 0.6, 0); // Position slightly above the user sphere
  userSphere.add(userLabel); // Attach label to the sphere

  // 2. 创建好友球体 - 只在全部图模式下显示
  if (isPersonalView.value) {
    allFriendPubs.forEach((pub, index) => {
      const friendSphere = createSphere(0.4, 0x00BFFF); // 蓝色
      friendSphere.userData.nodeKey = pub;
      
      // 恢复好友节点的保存位置，如果没有保存位置则生成随机位置
      const savedFriendPosition = nodePositions.get(pub);
      if (savedFriendPosition) {
        friendSphere.position.copy(savedFriendPosition);
        friendSphere.userData.isNewNode = false; // 已存在的节点，不需要动画
      } else {
        friendSphere.userData.isNewNode = true; // 标记为新节点，用于动画
        
        // Generate random positions within a spherical volume around the user sphere
        const minDistance = 2.0; // Minimum distance from the user sphere
        const maxDistance = 4.0; // Maximum distance from the user sphere

        let x, y, z, distance;
        do {
          x = (Math.random() - 0.5) * (maxDistance * 2); // -maxDistance to +maxDistance
          y = (Math.random() - 0.5) * (maxDistance * 2);
          z = (Math.random() - 0.5) * (maxDistance * 2);
          distance = Math.sqrt(x * x + y * y + z * z);
        } while (distance < minDistance || distance > maxDistance); // Ensure within the desired annular spherical volume

        friendSphere.position.set(x, y, z);
      }
      
      networkGroup.add(friendSphere);
      draggableObjects.push(friendSphere);

      const friendShape = new CANNON.Sphere(0.4);
      const friendBodyInstance = new CANNON.Body({ mass: 1, shape: friendShape, material: spherePhysMaterial });
      friendBodyInstance.position.copy(friendSphere.position as any);
      
      // 恢复好友节点的保存速度
      const savedFriendVelocity = nodeVelocities.get(pub);
      if (savedFriendVelocity) {
        friendBodyInstance.velocity.copy(savedFriendVelocity);
      }
      
      friendBodyInstance.linearDamping = 0.8;
      friendBodyInstance.angularDamping = 0.9;
      world.addBody(friendBodyInstance);
      nodeMeshes.set(pub, friendSphere);
      nodeBodies.set(pub, friendBodyInstance);

      // Create CSS2DObject for friend's alias
      const friendAlias = buddyList.value.find(b => b.pub === pub)?.alias || `Friend ${pub.slice(0, 8)}`;
      const friendLabelDiv = document.createElement('div');
      friendLabelDiv.className = 'friend-label';
      friendLabelDiv.textContent = friendAlias;
      const friendLabel = new CSS2DObject(friendLabelDiv);
      friendLabel.position.set(0, 0.6, 0); // Position is relative to the sphere now
      friendSphere.add(friendLabel); // Attach label to the sphere
    });
  }

  // 2.5. 在个人图模式下创建All节点
  if (!isPersonalView.value) {
    const allSphere = createSphere(0.4, 0x87CEEB); // 浅蓝色
    
    // 恢复All节点的保存位置，如果没有保存位置则使用默认位置
    const savedAllPosition = nodePositions.get('all');
    if (savedAllPosition) {
      allSphere.position.copy(savedAllPosition);
    } else {
      allSphere.position.set(3, 0, 0); // 放在用户右侧
    }
    
    allSphere.userData.nodeKey = 'all';
    allSphere.userData.isAllNode = true;
    networkGroup.add(allSphere);
    draggableObjects.push(allSphere);
    allNodeSphere = allSphere; // 保存引用

    const allShape = new CANNON.Sphere(0.4);
    const allBodyInstance = new CANNON.Body({ mass: 1, shape: allShape, material: spherePhysMaterial });
    allBodyInstance.position.copy(allSphere.position as any);
    
    // 恢复All节点的保存速度
    const savedAllVelocity = nodeVelocities.get('all');
    if (savedAllVelocity) {
      allBodyInstance.velocity.copy(savedAllVelocity);
    }
    
    allBodyInstance.linearDamping = 0.8;
    allBodyInstance.angularDamping = 0.9;
    world.addBody(allBodyInstance);
    nodeMeshes.set('all', allSphere);
    nodeBodies.set('all', allBodyInstance);

    // Create CSS2DObject for All label
    const allLabelDiv = document.createElement('div');
    allLabelDiv.className = 'friend-label';
    allLabelDiv.textContent = 'All';
    const allLabel = new CSS2DObject(allLabelDiv);
    allLabel.position.set(0, 0.6, 0);
    allSphere.add(allLabel);
    
    // 2.6. 创建自定义群组节点
    const enabledGroups = getEnabledGroups();
    const groupNames = Object.keys(enabledGroups);
    groupNodes.value = {}; // 清空之前的群组节点引用
    
    groupNames.forEach((groupName, index) => {
      const groupSphere = createSphere(0.35, 0xFF6B6B); // 红色群组节点
      const groupNodeKey = `group_${groupName}`;
      
      // 恢复群组节点的保存位置，如果没有保存位置则使用默认圆形布局
      const savedGroupPosition = nodePositions.get(groupNodeKey);
      if (savedGroupPosition) {
        groupSphere.position.copy(savedGroupPosition);
      } else {
        // 将群组节点放置在用户周围的圆形位置
        const angle = (index / groupNames.length) * Math.PI * 2;
        const radius = 2.5;
        groupSphere.position.set(
          Math.cos(angle) * radius,
          0.5,
          Math.sin(angle) * radius
        );
      }
      
      groupSphere.userData.nodeKey = groupNodeKey;
      groupSphere.userData.isGroupNode = true;
      groupSphere.userData.groupName = groupName;
      networkGroup.add(groupSphere);
      draggableObjects.push(groupSphere);
      groupNodes.value[groupName] = groupSphere;
      
      const groupShape = new CANNON.Sphere(0.35);
      const groupBodyInstance = new CANNON.Body({ mass: 1, shape: groupShape, material: spherePhysMaterial });
      groupBodyInstance.position.copy(groupSphere.position as any);
      
      // 恢复群组节点的保存速度
      const savedGroupVelocity = nodeVelocities.get(groupNodeKey);
      if (savedGroupVelocity) {
        groupBodyInstance.velocity.copy(savedGroupVelocity);
      }
      
      groupBodyInstance.linearDamping = 0.8;
      groupBodyInstance.angularDamping = 0.9;
      world.addBody(groupBodyInstance);
      nodeMeshes.set(groupNodeKey, groupSphere);
      nodeBodies.set(groupNodeKey, groupBodyInstance);
      
      // Create CSS2DObject for group label
      const groupLabelDiv = document.createElement('div');
      groupLabelDiv.className = 'friend-label';
      groupLabelDiv.textContent = groupName;
      const groupLabel = new CSS2DObject(groupLabelDiv);
      groupLabel.position.set(0, 0.6, 0);
      groupSphere.add(groupLabel);
    });
  } else {
    allNodeSphere = null; // 清除引用
    groupNodes.value = {}; // 清空群组节点引用
  }

  // 注意：不再创建陌生节点，只显示通讯录好友相关的节点，避免全网用户导致客户端崩溃
  
  // 3. 创建中继节点球体
  let relaysToShow;
  if (!isPersonalView.value) {
    // 个人图模式：只显示与用户直接连接的中继节点
    relaysToShow = Array.from(allRelays.keys()).filter(url => 
      allRelays.get(url)!.sharedBy.has(currentUserPub.value!)
    );
  } else {
    // 全部图模式：显示所有中继节点
    relaysToShow = Array.from(allRelays.keys());
  }

  relaysToShow.forEach(url => {
    const isUserRelay = allRelays.get(url)!.sharedBy.has(currentUserPub.value!); // If shared by current user
    const isFriendShared = Array.from(allRelays.get(url)!.sharedBy).some(pub => pub !== currentUserPub.value); // If shared by any friend
    let statusColor = 0xFFFF00; // Yellow: Stranger relay (default)

    if (isUserRelay && isFriendShared) {
      // 我和好友都连接的节点 - 根据我的连接状态显示
      const status = peerStatuses.value[url];
      if (status === 'connected') statusColor = 0x00FF00; // Green: 我已连接
      else if (status === 'disconnected') statusColor = 0xFF0000; // Red: 我连接失败
      else statusColor = 0x808080; // Gray: 我未连接但在列表中
    } else if (isUserRelay && !isFriendShared) {
      // 只有我连接的节点
      const status = peerStatuses.value[url];
      if (status === 'connected') statusColor = 0x00FF00; // Green
      else if (status === 'disconnected') statusColor = 0xFF0000; // Red
      else statusColor = 0x808080; // Gray
    } else if (!isUserRelay && isFriendShared) {
      // 只有通讯录好友连接的节点 - 黄色
      statusColor = 0xFFFF00; // Yellow: 好友共享的节点
    }

    const relaySphere = createSphere(0.3, statusColor);
    relaySphere.userData.url = url; // Store URL for click interaction
    relaySphere.userData.isFriendShared = !isUserRelay && isFriendShared; // 标记为好友共享的节点
    relaySphere.userData.nodeKey = url;
    
    // 恢复中继节点的保存位置，如果没有保存位置则生成随机位置
    const savedRelayPosition = nodePositions.get(url);
    if (savedRelayPosition) {
      relaySphere.position.copy(savedRelayPosition);
      if (!isPersonalView.value) {
        relaySphere.userData.isNewNode = false; // 已存在的节点，不需要动画
      }
    } else {
      if (!isPersonalView.value) {
        relaySphere.userData.isNewNode = true; // 标记为新节点，用于动画
      }
      
      // Introduce randomness for relay positioning
      const phi = Math.acos(-1 + (2 * relayIndex) / (allRelays.size > 1 ? allRelays.size - 1 : 1));
      const theta = Math.sqrt(allRelays.size * Math.PI) * phi;

      const phiJitter = (Math.random() - 0.5) * 0.3; // -0.15 to 0.15 radians
      const thetaJitter = (Math.random() - 0.5) * 0.3; // -0.15 to 0.15 radians

      const minRelayRadius = 4.0;
      const maxRelayRadius = 6.0;
      const currentRelayRadius = minRelayRadius + Math.random() * (maxRelayRadius - minRelayRadius);

      const yPositionRelay = (Math.random() - 0.5) * 2.0; // -1.0 to 1.0

      relaySphere.position.set(
        currentRelayRadius * Math.cos(theta + thetaJitter) * Math.sin(phi + phiJitter),
        currentRelayRadius * Math.sin(theta + thetaJitter) * Math.sin(phi + phiJitter) + yPositionRelay,
        currentRelayRadius * Math.cos(phi + phiJitter)
      );
    }

    networkGroup.add(relaySphere);
    draggableObjects.push(relaySphere);
    relayIndex++;

    const relayShape = new CANNON.Sphere(0.3);
    const relayBody = new CANNON.Body({ mass: 0.5, shape: relayShape, material: spherePhysMaterial });
    relayBody.position.copy(relaySphere.position as any);
    
    // 恢复中继节点的保存速度
    const savedRelayVelocity = nodeVelocities.get(url);
    if (savedRelayVelocity) {
      relayBody.velocity.copy(savedRelayVelocity);
    }
    
    relayBody.linearDamping = 0.8;
    relayBody.angularDamping = 0.9;
    world.addBody(relayBody);
    nodeMeshes.set(url, relaySphere);
    nodeBodies.set(url, relayBody);


    // Create CSS2DObject for relay URL
    const relayLabelDiv = document.createElement('div');
    relayLabelDiv.className = 'relay-label';
    relayLabelDiv.textContent = url.replace(/^(https?:\/\/|wss:\/\/)/, '').replace(/\/gun$/, ''); // Clean up URL for display
    const relayLabel = new CSS2DObject(relayLabelDiv);
    relayLabel.position.set(0, 0.4, 0); // Position is relative to the sphere now
    relaySphere.add(relayLabel); // Attach label to the sphere
  });

  // --- 连接线创建 ---
  // 1. 连接节点到中继
  if (!isPersonalView.value) {
    // 个人图模式：只显示用户到中继的连接线，不连接All节点
    relaysToShow.forEach(url => {
      const data = allRelays.get(url);
      const relayMesh = nodeMeshes.get(url);
      const relayBody = nodeBodies.get(url);
      if (!relayMesh || !relayBody || !data) return;

      // 只显示用户的连接，排除All节点
      if (data.sharedBy.has(currentUserPub.value!)) {
        const userMesh = nodeMeshes.get(currentUserPub.value);
        const userBody = nodeBodies.get(currentUserPub.value);
        if (userMesh && userBody) {
          const line = createLine(userMesh.position, relayMesh.position);
          (line.material as THREE.LineBasicMaterial).color.set(0x9370DB); // 紫色 - 我的连接
          networkGroup.add(line);

          // 添加物理约束
          const distance = userMesh.position.distanceTo(relayMesh.position);
          const constraint = new CANNON.DistanceConstraint(userBody, relayBody, distance);
          world.addConstraint(constraint);
        }
      }
    });
    
    // All节点不与任何节点连接，保持独立
  } else {
    // 全部图模式：显示所有连接线，包括陌生节点
    allRelays.forEach((data, url) => {
      const relayMesh = nodeMeshes.get(url);
      const relayBody = nodeBodies.get(url);
      if (!relayMesh || !relayBody) return;

      const isUserRelay = data.sharedBy.has(currentUserPub.value!);
      
      data.sharedBy.forEach(pub => {
        const nodeMesh = nodeMeshes.get(pub);
        const nodeBody = nodeBodies.get(pub);
        if (nodeMesh && nodeBody) {
          // 显示所有连接线，包括陌生节点的连接
          const line = createLine(nodeMesh.position, relayMesh.position);
          // 根据节点类型设置线条颜色
          if (pub === currentUserPub.value) {
            (line.material as THREE.LineBasicMaterial).color.set(0x9370DB); // 紫色 - 我的连接
          } else if (buddyList.value.some(buddy => buddy.pub === pub)) {
            (line.material as THREE.LineBasicMaterial).color.set(0x00BFFF); // 蓝色 - 好友的连接
          } else {
            (line.material as THREE.LineBasicMaterial).color.set(0xFFFF00); // 黄色 - 陌生人的连接
            (line.material as THREE.LineBasicMaterial).opacity = 0.7;
          }
          networkGroup.add(line);

          // 添加物理约束
          const distance = nodeMesh.position.distanceTo(relayMesh.position);
          const constraint = new CANNON.DistanceConstraint(nodeBody, relayBody, distance);
          world.addConstraint(constraint);
        }
      });
    });
  }

  // 2. 直接连接用户和好友 - 只在全部图模式下显示
  if (isPersonalView.value) {
    const userMeshForDirectConnection = nodeMeshes.get(currentUserPub.value);
    const userBodyForDirectConnection = nodeBodies.get(currentUserPub.value);
    if (userMeshForDirectConnection && userBodyForDirectConnection) {
      allFriendPubs.forEach(friendPub => {
        const friendMesh = nodeMeshes.get(friendPub);
        const friendBody = nodeBodies.get(friendPub);

        if (friendMesh && friendBody) {
            const line = createLine(userMeshForDirectConnection.position, friendMesh.position);
            if (line.material instanceof THREE.LineBasicMaterial) {
              line.material.color.set(0xADD8E6); // 浅蓝色表示好友关系
              line.material.opacity = 0.6;
            }
            networkGroup.add(line);

          const distance = userMeshForDirectConnection.position.distanceTo(friendMesh.position);
          const constraint = new CANNON.DistanceConstraint(userBodyForDirectConnection, friendBody, distance);
          world.addConstraint(constraint);
        }
      });
    }
  }

  // 3. 连接共享同一中继的节点 - 只在全部图模式下显示
  if (isPersonalView.value) {
    const connectedPairs = new Set<string>();
    allRelays.forEach(data => {
      const sharers = Array.from(data.sharedBy);
      for (let i = 0; i < sharers.length; i++) {
        for (let j = i + 1; j < sharers.length; j++) {
          const pub1 = sharers[i];
          const pub2 = sharers[j];
          const pairKey = [pub1, pub2].sort().join('-');
          
          if (connectedPairs.has(pairKey)) continue;

          const mesh1 = nodeMeshes.get(pub1);
          const mesh2 = nodeMeshes.get(pub2);
          const body1 = nodeBodies.get(pub1);
          const body2 = nodeBodies.get(pub2);

          if (mesh1 && mesh2 && body1 && body2) {
            const line = createLine(mesh1.position, mesh2.position);
            (line.material as THREE.LineBasicMaterial).color.set(0x00ffff); // 使用不同的颜色以区分
            (line.material as THREE.LineBasicMaterial).opacity = 0.3;
            networkGroup.add(line);
            connectedPairs.add(pairKey);

            // 可选：也为这些直接连接添加物理约束
            const distance = mesh1.position.distanceTo(mesh2.position);
            const constraint = new CANNON.DistanceConstraint(body1, body2, distance);
            constraint.collideConnected = false; // 允许连接的物体碰撞
            world.addConstraint(constraint);
          }
        }
      }
    });
  }
  
  // 4. 连接同一群组内的中继节点 - 在个人图模式下显示
  if (!isPersonalView.value) {
    const enabledGroups = getEnabledGroups();
    Object.entries(enabledGroups).forEach(([groupName, groupData]: [string, any]) => {
      if (groupData.peers && Array.isArray(groupData.peers)) {
        const groupPeers = groupData.peers;
        const connectedGroupPairs = new Set<string>();
        
        // 连接群组内的每对中继节点
        for (let i = 0; i < groupPeers.length; i++) {
          for (let j = i + 1; j < groupPeers.length; j++) {
            const peer1 = groupPeers[i];
            const peer2 = groupPeers[j];
            const pairKey = [peer1, peer2].sort().join('-');
            
            if (connectedGroupPairs.has(pairKey)) continue;
            
            const mesh1 = nodeMeshes.get(peer1);
            const mesh2 = nodeMeshes.get(peer2);
            const body1 = nodeBodies.get(peer1);
            const body2 = nodeBodies.get(peer2);
            
            if (mesh1 && mesh2 && body1 && body2) {
              const line = createLine(mesh1.position, mesh2.position);
              (line.material as THREE.LineBasicMaterial).color.set(0xFF6B6B); // 红色群组连接线
              (line.material as THREE.LineBasicMaterial).opacity = 0.6;
              networkGroup.add(line);
              connectedGroupPairs.add(pairKey);
              
              // 添加物理约束
              const distance = mesh1.position.distanceTo(mesh2.position);
              const constraint = new CANNON.DistanceConstraint(body1, body2, distance);
              constraint.collideConnected = false;
              world.addConstraint(constraint);
            }
          }
        }
        
        // 连接群组节点到群组内的中继节点
        const groupNodeMesh = groupNodes.value[groupName];
        const groupNodeBody = nodeBodies.get(`group_${groupName}`);
        if (groupNodeMesh && groupNodeBody) {
          groupPeers.forEach(peerUrl => {
            const peerMesh = nodeMeshes.get(peerUrl);
            const peerBody = nodeBodies.get(peerUrl);
            if (peerMesh && peerBody) {
              const line = createLine(groupNodeMesh.position, peerMesh.position);
              (line.material as THREE.LineBasicMaterial).color.set(0xFF8C8C); // 浅红色群组到节点连接线
              (line.material as THREE.LineBasicMaterial).opacity = 0.4;
              networkGroup.add(line);
              
              // 添加物理约束
              const distance = groupNodeMesh.position.distanceTo(peerMesh.position);
              const constraint = new CANNON.DistanceConstraint(groupNodeBody, peerBody, distance);
              world.addConstraint(constraint);
            }
          });
        }
      }
    });
  }
};

// 辅助函数：创建球体
const createSphere = (radius: number, color: number): THREE.Mesh => {
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  
  // 创建带噪点效果的材质
  const material = new THREE.MeshStandardMaterial({ 
    color,
    roughness: 0.3, // 降低粗糙度，使其更光滑
    metalness: 0.6, // 增加金属感，使其更亮
  });
  
  // 添加强噪点纹理
  const canvas = document.createElement('canvas');
  canvas.width = 128; // 使用较小的画布以获得更明显的像素效果
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  
  const imageData = ctx.createImageData(128, 128);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // 生成更强、对比度更高的噪点
    const noise = Math.random() > 0.55 ? 200 : 20; 
    data[i] = noise;     // R
    data[i + 1] = noise; // G
    data[i + 2] = noise; // B
    data[i + 3] = 255;   // A (完全不透明)
  }
  ctx.putImageData(imageData, 0, 0);
  
  const noiseTexture = new THREE.CanvasTexture(canvas);
  noiseTexture.wrapS = THREE.RepeatWrapping;
  noiseTexture.wrapT = THREE.RepeatWrapping;
  noiseTexture.repeat.set(4, 4); // 增加重复次数以获得更密集的噪点
  
  material.normalMap = noiseTexture; // 用作法线贴图以产生凹凸效果
  material.normalScale.set(0.5, 0.5);

  const mesh = new THREE.Mesh(geometry, material);
  
  // 可选：保留一个微妙的光晕效果
  const glowGeometry = new THREE.SphereGeometry(radius * 1.15, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  mesh.add(glowMesh);
  
  return mesh;
};

// 辅助函数：创建线条
const createLine = (start: THREE.Vector3, end: THREE.Vector3): THREE.Line => {
  const points = [start, end]; // 直线
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  const material = new THREE.LineBasicMaterial({ 
    color: 0xaaaaaa, 
    transparent: true, 
    opacity: 0.5, // 稍微不透明
    linewidth: 1.5 // 稍微细一点
  });
  
  const line = new THREE.Line(geometry, material);
  line.userData.startNode = start; // Store references for updating
  line.userData.endNode = end;
  
  return line;
};

const setupDragControls = () => {
  if (!camera || !renderer || !networkCanvasRef.value) return;

  dragControls = new DragControls(draggableObjects, camera, renderer.domElement);

  let draggedBody: CANNON.Body | null = null;
  let originalMass: number = 0;

  dragControls.addEventListener('dragstart', (event) => {
    if (controls) controls.enabled = false;
    dragControls.dragging = true; // Custom flag
    const draggedMesh = event.object as THREE.Mesh;
    
    // Find the corresponding CANNON.Body
    for (const [key, mesh] of nodeMeshes.entries()) {
      if (mesh === draggedMesh) {
        draggedBody = nodeBodies.get(key) || null;
        if (draggedBody) {
          // Store original mass and increase it to make dragging smoother
          originalMass = draggedBody.mass;
          draggedBody.mass = originalMass * 10; // Increase mass for stability
          draggedBody.updateMassProperties();
          
          // Reduce velocity to make dragging more responsive
          draggedBody.velocity.set(0, 0, 0);
          draggedBody.angularVelocity.set(0, 0, 0);
        }
        break;
      }
    }
  });

  dragControls.addEventListener('drag', (event) => {
    if (draggedBody) {
      // Smoothly update the physics body's position
      const targetPos = event.object.position;
      const targetVec = new CANNON.Vec3(targetPos.x, targetPos.y, targetPos.z);
      draggedBody.position.lerp(targetVec, 0.8, draggedBody.position);
      
      // Apply a small force towards the target position for natural movement
      const force = new CANNON.Vec3(
        (targetPos.x - draggedBody.position.x) * 50,
        (targetPos.y - draggedBody.position.y) * 50,
        (targetPos.z - draggedBody.position.z) * 50
      );
      draggedBody.force.copy(force);
    }
  });

  dragControls.addEventListener('dragend', (event) => {
    if (controls) controls.enabled = true;
    dragControls.dragging = false; // Custom flag
    
    // 检查是否是点击而非拖拽（拖拽距离很小时视为点击）
    const draggedMesh = event.object as THREE.Mesh;
    if (draggedMesh.userData.isAllNode) {
      // 如果是All节点，触发点击事件
      handleAllNodeClick();
    }
    
    if (draggedBody) {
      // Restore original mass and clear forces
      draggedBody.mass = originalMass;
      draggedBody.updateMassProperties();
      draggedBody.force.set(0, 0, 0);
      
      // Add a very small impulse for natural release effect and stop rotation
      const releaseImpulse = new CANNON.Vec3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      );
      draggedBody.applyImpulse(releaseImpulse, draggedBody.position);
      
      // Stop any rotation to prevent spinning
      draggedBody.angularVelocity.set(0, 0, 0);
      
      draggedBody = null;
    }
  });
};

// 点击事件处理
const onCanvasClick = (event: MouseEvent) => {
  if (!networkCanvasRef.value || !camera) return;

  const raycaster = new Raycaster();
  const mouse = new Vector2();
  
  // 将鼠标点击位置转换为标准化设备坐标
  const rect = networkCanvasRef.value.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  const intersects = raycaster.intersectObjects(networkGroup.children);
  
  if (intersects.length > 0) {
    const firstIntersected = intersects[0].object as THREE.Mesh;
    
    // 检查是否点击了用户节点
    if (firstIntersected.userData.nodeKey === currentUserPub.value) {
      handleUserNodeClick();
      return;
    }
    
    // 检查是否点击了All节点
    if (firstIntersected.userData.isAllNode) {
      handleAllNodeClick();
      return;
    }
    
    if (firstIntersected.userData.isFriendShared && firstIntersected.userData.url) {
      // Just show toast on click, modal is opened by button now
      showToast(t('relayToast', { url: firstIntersected.userData.url }), 'info');
    }
  }
};

// 新增：打开好友分享节点模态窗口的独立函数
const openStrangerRelayModal = () => {
  strangerRelaysList.value = [];
  
  // 收集好友分享的节点（不是我自己的节点）
  networkGroup.children.forEach(child => {
    const mesh = child as THREE.Mesh;
    if (mesh.userData.isFriendShared && mesh.userData.url) {
      if (!strangerRelaysList.value.includes(mesh.userData.url)) {
        strangerRelaysList.value.push(mesh.userData.url);
      }
    }
  });
  
  // 如果没有从3D场景中找到，直接从friendsRelays数据中收集
  if (strangerRelaysList.value.length === 0) {
    const allFriendPubs = buddyList.value.map(buddy => buddy.pub);
    for (const friendPub in friendsRelays.value) {
      if (allFriendPubs.includes(friendPub)) {
        const relays = friendsRelays.value[friendPub];
        if (relays && Array.isArray(relays)) {
          relays.forEach(url => {
            // 只添加不是我自己连接的节点
            if (!peersList.value.includes(url) && !strangerRelaysList.value.includes(url)) {
              strangerRelaysList.value.push(url);
            }
          });
        }
      }
    }
  }

  if (strangerRelaysList.value.length > 0) {
    isStrangerRelayModalOpen.value = true;
  } else {
    showToast(t('noStrangerRelays'), 'info');
  }
};

// 新增：处理添加陌生节点逻辑
const handleAddStrangerRelay = (url: string) => {
  addPeer(url);
  showToast(t('relayAddedRestart'), 'success');
  // 从列表中移除，提供即时反馈
  strangerRelaysList.value = strangerRelaysList.value.filter(item => item !== url);
  if(strangerRelaysList.value.length === 0){
    isStrangerRelayModalOpen.value = false;
  }
};

// 处理用户节点点击事件 - 切换到个人网格模式
const handleUserNodeClick = () => {
 // console.log('User node clicked, switching to personal grid mode');
  
  // 如果已经在个人模式，则不执行任何操作
  if (!isPersonalView.value) {
  //  console.log('Already in personal view mode');
    return;
  }
  
  // 切换到个人模式
  isPersonalView.value = false;
  
  // 通知父组件更新toggle状态
  emit('viewModeChanged', isPersonalView.value);
  
  // 开始黑洞吸收动画
  startBlackholeAbsorption();
};

// 黑洞吸收动画效果
const startBlackholeAbsorption = () => {
  if (!scene || !networkGroup) return;
  
 // console.log('Starting blackhole absorption animation');
  
  // 首先创建All节点（如果不存在）
  let allNode = allNodeSphere;
  if (!allNode) {
    allNode = createSphere(0.4, 0x87CEEB); // 浅蓝色
    allNode.position.set(3, 0, 0); // 放在用户右侧
    allNode.userData.nodeKey = 'all';
    allNode.userData.isAllNode = true;
    allNode.scale.set(0, 0, 0); // 初始缩放为0
    networkGroup.add(allNode);
    draggableObjects.push(allNode);
    allNodeSphere = allNode;
    
    // 创建All节点的标签
    const allLabelDiv = document.createElement('div');
    allLabelDiv.className = 'friend-label';
    allLabelDiv.textContent = 'All';
    const allLabel = new CSS2DObject(allLabelDiv);
    allLabel.position.set(0, 0.6, 0);
    allNode.add(allLabel);
    
    // 创建All节点的物理体
    const allShape = new CANNON.Sphere(0.4);
    const allBodyInstance = new CANNON.Body({ mass: 1, shape: allShape, material: spherePhysMaterial });
    allBodyInstance.position.copy(allNode.position as any);
    allBodyInstance.linearDamping = 0.8;
    allBodyInstance.angularDamping = 0.9;
    world.addBody(allBodyInstance);
    nodeMeshes.set('all', allNode);
    nodeBodies.set('all', allBodyInstance);
  }
  
  // All节点渐现动画
  const allNodeAppearAnimation = () => {
    const targetScale = 1;
    const animationDuration = 1000; // 1秒
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      
      const currentScale = easeProgress * targetScale;
      allNode!.scale.set(currentScale, currentScale, currentScale);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // All节点出现完成，开始吸收其他节点
        startNodeAbsorption(allNode!);
      }
    };
    
    requestAnimationFrame(animate);
  };
  
  allNodeAppearAnimation();
};

// 节点被吸收到All节点的动画
const startNodeAbsorption = (allNode: THREE.Mesh) => {
  if (!networkGroup) return;
  
 // console.log('Starting node absorption animation');
  
  // 收集需要被吸收的节点（好友节点和非用户的中继节点）
  const nodesToAbsorb: THREE.Mesh[] = [];
  
  networkGroup.children.forEach(child => {
    const mesh = child as THREE.Mesh;
    if (mesh.userData.nodeKey && 
        mesh.userData.nodeKey !== currentUserPub.value && // 不是用户节点
        mesh.userData.nodeKey !== 'all' && // 不是All节点
        !mesh.userData.isGroupNode) { // 不是群组节点
      
      // 检查是否是好友节点或非用户的中继节点
      const isFriendNode = buddyList.value.some(buddy => buddy.pub === mesh.userData.nodeKey);
      const isNonUserRelay = mesh.userData.url && !peersList.value.includes(mesh.userData.url);
      
      if (isFriendNode || isNonUserRelay) {
        nodesToAbsorb.push(mesh);
      }
    }
  });
  
 // console.log(`Found ${nodesToAbsorb.length} nodes to absorb`);
  
  // 为每个节点创建吸收动画
  nodesToAbsorb.forEach((node, index) => {
    const delay = index * 100; // 每个节点延迟100ms开始动画
    
    setTimeout(() => {
      animateNodeAbsorption(node, allNode);
    }, delay);
  });
  
  // 动画完成后重新创建网络图
  const totalAnimationTime = nodesToAbsorb.length * 100 + 1000; // 所有动画完成时间
  setTimeout(() => {
    createNetworkGraph(); // 重新创建网络图以应用个人模式
  }, totalAnimationTime);
};

// 单个节点的吸收动画
const animateNodeAbsorption = (node: THREE.Mesh, allNode: THREE.Mesh) => {
  const startPosition = node.position.clone();
  const targetPosition = allNode.position.clone();
  const startScale = node.scale.clone();
  const animationDuration = 800; // 0.8秒
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / animationDuration, 1);
    const easeProgress = Math.pow(progress, 2); // ease-in quadratic
    
    // 位置插值（向All节点移动）
    node.position.lerpVectors(startPosition, targetPosition, easeProgress);
    
    // 缩放插值（逐渐缩小）
    const currentScale = (1 - easeProgress) * startScale.x;
    node.scale.set(currentScale, currentScale, currentScale);
    
    // 更新物理体位置
    const nodeKey = node.userData.nodeKey;
    if (nodeKey && nodeBodies.has(nodeKey)) {
      const body = nodeBodies.get(nodeKey)!;
      body.position.copy(node.position as any);
    }
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // 动画完成，隐藏节点
      node.visible = false;
      node.scale.set(0, 0, 0);
    }
  };
  
  requestAnimationFrame(animate);
};


const toggleRelaySharingStatus = async () => {
  try {
    const oldStatus = isRelaySharingEnabled.value;
    const newStatus = !oldStatus;

    
    await toggleRelaySharing(newStatus, false);
    

    
    if (newStatus) {
      showToast(t('relaySharingEnabled'), 'success');
    } else {
      showToast(t('relaySharingDisabled'), 'info');
    }
    
    // 触发好友监听器重新获取数据
    setTimeout(() => {

      setupFriendListeners();
      // 重新创建网络图以显示更新的连接
      createNetworkGraph();
    }, 1000);
    
  } catch (error) {

    showToast(t('relaysShareFailed'), 'error');
  }
};

const shareMyRelaysToFriends = async () => {
  if (!gun || !currentUserPub.value || enabledPeers.value.length === 0) {
    showToast(t('noRelaysToShare'), 'warning');
    return;
  }

  try {
    // 使用TalkFlowCore的toggleRelaySharing功能来启用中继共享
    await toggleRelaySharing(true, false);
    
    //showToast(t('RelaysSharedSuccess'), 'success');
    
    // 触发好友监听器重新获取数据
    setTimeout(() => {
      setupFriendListeners();
      // 重新创建网络图以显示更新的连接
      createNetworkGraph();
    }, 1000);
    
  } catch (error) {
   // console.error('Failed to share relays:', error);
    showToast(t('relaysShareFailed'), 'error');
  }
};

// 添加后期处理效果
const setupPostProcessing = () => {
  if (!scene || !renderer) return;
  
  // 添加雾效果增强氛围
  scene.fog = new THREE.Fog(0x000000, 10, 50);
  
  // 设置渲染器的色调映射
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  
  // 启用阴影
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
};

// 动画循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate);
  
  // Update physics world
  if (world) {
    if (world.bodies.length > 0) {
      world.step(1 / 60);
    } else {

    }

    // Sync physics bodies with three.js meshes
    for (const [key, body] of nodeBodies.entries()) {
      const mesh = nodeMeshes.get(key);
      if (mesh) {
        mesh.position.copy(body.position as any);
        mesh.quaternion.copy(body.quaternion as any);
      }
    }

    // Update lines
    networkGroup.children.forEach(child => {
      if (child instanceof THREE.Line) {
        const line = child as THREE.Line;
        const startPos = line.userData.startNode;
        const endPos = line.userData.endNode;
        const geometry = line.geometry as THREE.BufferGeometry;
        const positions = geometry.attributes.position.array as Float32Array;
        positions[0] = startPos.x;
        positions[1] = startPos.y;
        positions[2] = startPos.z;
        positions[3] = endPos.x;
        positions[4] = endPos.y;
        positions[5] = endPos.z;
        geometry.attributes.position.needsUpdate = true;
      }
    });
  }

  // 缓慢自转
  if (!dragControls?.dragging) { // Only rotate when not dragging
    networkGroup.rotation.y += 0.0005;
  }
  
  // 添加动态噪点效果
  networkGroup.children.forEach((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      // 轻微的材质属性动画
      const time = Date.now() * 0.001;
      child.material.roughness = 0.7 + Math.sin(time + child.position.x) * 0.1;
    }
    
  });

  controls?.update();
  renderer?.render(scene!, camera!);
  labelRenderer?.render(scene!, camera!); // Render labels
};

// 窗口大小调整
const onWindowResize = () => {
  if (camera && renderer && networkCanvasRef.value) {
    camera.aspect = networkCanvasRef.value.clientWidth / networkCanvasRef.value.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(networkCanvasRef.value.clientWidth, networkCanvasRef.value.clientHeight);
    labelRenderer?.setSize(networkCanvasRef.value.clientWidth, networkCanvasRef.value.clientHeight); // Resize label renderer
  }
};

const cleanupThreeScene = () => {
//  console.log('Starting Three.js scene cleanup...');
  
  // 停止所有定时器和动画
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }
  
  // 移除事件监听器
  try {
    window.removeEventListener('resize', onWindowResize);
  } catch (error) {
    console.warn('Error removing resize listener:', error);
  }
  
  // 清理拖拽控制器
  if (dragControls) {
    try {
      dragControls.dispose();
    } catch (error) {
    //  console.warn('Error disposing drag controls:', error);
    }
    dragControls = null;
  }
  
  // 清理轨道控制器
  if (controls) {
    try {
      controls.dispose();
    } catch (error) {
     // console.warn('Error disposing orbit controls:', error);
    }
    controls = null;
  }
  
  // 清理物理世界
  if (world) {
    try {
      // 清理所有约束
      const constraintsToRemove = [...world.constraints];
      constraintsToRemove.forEach(constraint => {
        try {
          world.removeConstraint(constraint);
        } catch (error) {
       //   console.warn('Error removing constraint:', error);
        }
      });
      
      // 清理所有刚体
      const bodiesToRemove = [...world.bodies];
      bodiesToRemove.forEach(body => {
        try {
          world.removeBody(body);
        } catch (error) {
       //   console.warn('Error removing body:', error);
        }
      });
    } catch (error) {
     // console.warn('Error cleaning up physics world:', error);
    }
    world = null;
  }
  
  // 清理物理材质
  spherePhysMaterial = null;
  
  // 清理物理对象映射
  nodeBodies.clear();
  nodeMeshes.clear();
  draggableObjects.length = 0;
  
  // 清理场景中的所有对象
  if (scene) {
    try {
      // 递归清理所有子对象
      scene.traverse((child) => {
        // 类型检查：确保对象有geometry属性（如Mesh对象）
        if ('geometry' in child && (child as any).geometry) {
          (child as any).geometry.dispose();
        }
        // 类型检查：确保对象有material属性（如Mesh对象）
        if ('material' in child && (child as any).material) {
          const material = (child as any).material;
          if (Array.isArray(material)) {
            material.forEach((mat: any) => mat.dispose());
          } else {
            material.dispose();
          }
        }
        // 清理CSS2D对象
        if (child.type === 'CSS2DObject') {
          const css2dObj = child as any;
          if (css2dObj.element && css2dObj.element.parentNode) {
            css2dObj.element.parentNode.removeChild(css2dObj.element);
          }
        }
      });
      
      // 清空场景
      while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
      }
    } catch (error) {
     // console.warn('Error cleaning up scene:', error);
    }
    scene = null;
  }
  
  // 清理网络组
  if (networkGroup) {
    try {
      networkGroup.clear();
    } catch (error) {
     // console.warn('Error clearing network group:', error);
    }
  }
  
  // 清理labelRenderer
  if (labelRenderer) {
    try {
      // 清理所有子元素
      while (labelRenderer.domElement.firstChild) {
        labelRenderer.domElement.removeChild(labelRenderer.domElement.firstChild);
      }
      // 从DOM中移除labelRenderer元素
      if (labelRenderer.domElement.parentNode) {
        labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement);
      }
    } catch (error) {
     // console.warn('Error cleaning up label renderer:', error);
    }
    labelRenderer = null;
  }
  
  // 清理渲染器
  if (renderer) {
    try {
      renderer.dispose();
      renderer.forceContextLoss();
    } catch (error) {
     // console.warn('Error disposing renderer:', error);
    }
    renderer = null;
  }
  
  // 重置相机
  camera = null;
  
 // console.log('Three.js scene cleanup completed');
}

// 监听全局共享中继数据池
const setupFriendListeners = () => {
  //console.log('Setting up friend listeners...');
  
  if (!gun) {
    console.warn('Gun instance not available, skipping listener setup');
    return;
  }

  // 清理旧的监听器
  Object.values(friendListeners).forEach(off => {
    try {
      if (typeof off === 'function') {
        off();
      }
    } catch (error) {
     // console.warn('Error cleaning up old listener:', error);
    }
  });
  
  // 清空监听器对象
  Object.keys(friendListeners).forEach(key => {
    delete friendListeners[key];
  });
  
  // 清空旧的好友中继数据
  friendsRelays.value = {};
  
  // 监听所有好友的中继列表
  buddyList.value?.forEach(buddy => {
    const userPub = buddy.pub;
    
    try {
      friendListeners[userPub] = gun.get('users').get(userPub).get('relaylist').on((data) => {
        if (data) {
          try {
            const relayData = JSON.parse(data);
            if (relayData && Array.isArray(relayData.relays)) {
              friendsRelays.value[userPub] = relayData.relays;
              // 只有在canvas已经准备好时才触发数据更新
              if (isCanvasReady.value) {
                handleDataUpdate();
              }
            }
          } catch (e) {
          //  console.warn('Error parsing relay data for user:', userPub, e);
          }
        }
      });
    } catch (error) {
     // console.warn('Error setting up listener for user:', userPub, error);
    }
  });
  
  // 监听所有用户的中继列表（包括陌生人）
  try {
    friendListeners['allUsers'] = gun.get('users').map().on((userData, userPub) => {
      if (!userPub || userPub === currentUserPub.value) return;
      
      // 监听每个用户的relaylist
      gun.get('users').get(userPub).get('relaylist').on((data) => {
        if (data) {
          try {
            const relayData = JSON.parse(data);
            if (relayData && Array.isArray(relayData.relays)) {
              friendsRelays.value[userPub] = relayData.relays;
              
              const isFriend = buddyList.value?.some(buddy => buddy.pub === userPub);
              const userType = isFriend ? 'friend' : 'stranger';
              
              // 只有在canvas已经准备好时才触发数据更新
              if (isCanvasReady.value) {
                handleDataUpdate();
              }
            }
          } catch (e) {
         //   console.warn('Error parsing relay data for user:', userPub, e);
          }
        }
      });
    });
  } catch (error) {
    //console.warn('Error setting up allUsers listener:', error);
  }
  
  //console.log('Friend listeners setup completed');
};

// 移除自动监听，只在用户点击showCanvas时才设置监听器
// watch(buddyList, setupFriendListeners, { deep: true, immediate: true });

// 监听friendsRelays数据变化 - 只在canvas已经初始化后才工作
watch(friendsRelays, () => {
  // 只有在canvas已经准备好且用户已经点击显示时才处理数据更新
  if (isCanvasReady.value && !showCover.value) {
    handleDataUpdate();
    // 如果canvas已经显示，则重新绘制
    if (scene && networkGroup) {
      createNetworkGraph();
    }
  }
}, { deep: true });

// 监听peersList变化 - 只在canvas已经初始化后才工作
watch(peersList, () => {
  // 只有在canvas已经准备好且用户已经点击显示时才处理数据更新
  if (isCanvasReady.value && !showCover.value) {
    handleDataUpdate();
    // 如果canvas已经显示，则重新绘制
    if (scene && networkGroup) {
      createNetworkGraph();
    }
  }
}, { deep: true });


// 组件挂载和卸载
onMounted(() => {
  // 不在挂载时初始化任何内容，等待用户点击showCanvas
 // console.log('NetworkCanvas mounted, waiting for user interaction');
});

onUnmounted(() => {
 // console.log('NetworkCanvas unmounting, cleaning up all resources');
  
  // 清理所有定时器
  if (dataStableTimer) {
    clearTimeout(dataStableTimer);
    dataStableTimer = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
  
  // 清理Three.js场景
  cleanupThreeScene();
  
  // 清理所有监听器
  Object.values(friendListeners).forEach(off => {
    try {
      if (typeof off === 'function') {
        off();
      }
    } catch (error) {
    //  console.warn('Error cleaning up listener:', error);
    }
  });
  
  // 清空监听器对象
  Object.keys(friendListeners).forEach(key => {
    delete friendListeners[key];
  });
  
  // 重置所有状态
  friendsRelays.value = {};
  strangerRelaysList.value = [];
  isStrangerRelayModalOpen.value = false;
  isLegendVisible.value = false;
  showCover.value = true;
  isDataLoading.value = false;
  isCanvasReady.value = false;
  preloadedData.value = null;
  lastDataUpdateTime = 0;
  
 // console.log('NetworkCanvas cleanup completed');
});

// 新增：设置视图模式方法（带动画）
const setViewMode = (personalView: boolean) => {
  if (isPersonalView.value === personalView) {
    return; // 如果模式相同，不执行切换
  }
  
  isPersonalView.value = personalView;
  
  if (!personalView) {
    // 切换到个人模式：执行黑洞吸收动画
    startBlackholeAbsorption();
  } else {
    // 切换到全部模式：执行节点展开动画
    createNetworkGraphWithAnimation();
  }
};

// 暴露方法给父组件
defineExpose({
  refreshCanvas,
  toggleLegend,
  openStrangerRelayModal,
  setViewMode,
  showCover
});
</script>

<style scoped>
.network-canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* 3D网络Canvas样式 */
.network-canvas {
  width: 100% !important;
  height: 100% !important;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  cursor: grab;
}

.network-canvas:active {
  cursor: grabbing;
}

/* 封面样式 */
.mesh-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); */
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 5;
  transition: opacity 0.3s ease;
}



.cover-content {
  text-align: center;
  
  user-select: none;
}

.mesh-title {
  font-size: 3rem;
  font-weight: 300;
  margin: 0 0 2rem 0;
  background: linear-gradient(45deg, #9370DB, #00BFFF, #00FF00);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 3s ease-in-out infinite;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.loading-indicator {
  margin-bottom: 2rem;
}

.loading-dots {
  display: inline-flex;
  gap: 4px;
  margin-bottom: 1rem;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9370DB;
  animation: loadingDot 1.4s ease-in-out infinite both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }
.loading-dots span:nth-child(3) { animation-delay: 0s; }

@keyframes loadingDot {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.loading-text {
  font-size: 1.1rem;
  margin: 0;
  opacity: 0.8;
  font-weight: 300;
}

.ready-hint {
  animation: pulse 2s ease-in-out infinite;
}

.play-icon {
  font-size: 3rem;
  color: #00FF00;
  filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.5));
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

.legend-panel {
  position: absolute;
  top: 20%;
  left: 10px;
  margin-top: 8px;
  z-index: 10;
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
  color: white;
  width: 200px;
}

/* 节点标签样式 */
.user-label {
  color: #9370DB;
  font-weight: bold;
  font-size: 12px;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #9370DB;
}

.friend-label {
  color: #00BFFF;
  font-weight: bold;
  font-size: 11px;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #00BFFF;
}

.stranger-label {
  color: #FFFF00;
  font-weight: bold;
  font-size: 10px;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #FFFF00;
}

.relay-label {
  color: #FFFFFF;
  font-size: 9px;
  text-align: center;
  background: rgba(0, 0, 0, 0.8);
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid #666;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-title {
  font-weight: bold;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 4px;
}

.legend-panel ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.legend-panel li {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.9em;
}

.legend-panel li:last-child {
  margin-bottom: 0;
}

.legend-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.canvas-buttons {
  position: absolute;
  top: 60px;
  right: 8px;
  z-index: 10;
  display: flex;
  gap: 8px;
}

.legend-button,
.stranger-list-button,
.refresh-canvas-button,
.relay-sharing-button {
  --padding-start: 8px;
  --padding-end: 8px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  height: 36px;
  width: 36px;
  margin-right: 10px;
}

.legend-button ion-icon, .stranger-list-button ion-icon {
  font-size: 24px;
}

.stranger-relay-modal .relay-item {
  --padding-start: 16px;
  --padding-end: 16px;
  border-bottom: 1px solid var(--ion-border-color, rgba(0,0,0,0.1));
}

.stranger-relay-modal .relay-url {
  font-family: monospace;
  font-size: 0.9em;
}

.stranger-relay-modal ion-button {
  --padding-start: 8px;
  --padding-end: 8px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--ion-color-medium);
}

.empty-state p {
  margin-bottom: 20px;
  font-size: 1.1em;
}

.empty-state ion-button {
  margin-top: 10px;
}

.friend-label {
  color: white; /* 默认白色文字 */
  font-size: 0.7em; /* 字体大小 */
  font-weight: bold;
  background: rgba(0, 0, 0, 0.5); /* 半透明黑色背景 */
  padding: 3px 6px;
  border-radius: 4px;
  pointer-events: none; /* 确保不影响鼠标事件 */
  white-space: nowrap; /* 防止换行 */
  transform: translateY(-100%); /* 向上偏移，使其位于球体上方 */
}

.user-label, .relay-label {
  color: white;
  font-size: 0.65em;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 5px;
  border-radius: 3px;
  pointer-events: none;
  white-space: nowrap;
  transform: translateY(-100%);
}

html.dark .friend-label, html.dark .user-label, html.dark .relay-label {
  color: #eee;
  background: rgba(255, 255, 255, 0.2);
}

html.light .friend-label, html.light .user-label, html.light .relay-label {
  color: #333;
  background: rgba(0, 0, 0, 0.2);
}
</style>