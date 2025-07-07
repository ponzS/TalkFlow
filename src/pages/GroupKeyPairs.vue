<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <div color="dark" @click="goBack">
            <ion-icon style="font-size:25px;margin-left:10px;" color="dark" :ios="chevronBackOutline" :md="chevronBackOutline"></ion-icon>
          </div>
        </ion-buttons>
        <ion-title></ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content style="margin:0;padding:0" :scroll-y="false" >
      <div class="card-container" ref="cardContainer" @scroll="updateCenteredCard">
        <div
          v-for="(group, index) in groups"
          :key="group.pub"
          class="card"
          :data-index="index"
          :data-pub="group.pub"
        >
          <object
            class="gun-avatar"
            type="image/svg+xml"
            :src="group.pub"
            :key="group.pub"
            :data="
              gunAvatar({
                pub: group.pub,
                svg: 'interactive',
                round: false,
                dark: isDark,
                p3: true,
              })
            "
          ></object>
          <div class="card-content">
            <h2 class="group-name">{{ group.name }}</h2>
            <p class="group-pubkey">@{{ formatPubKey(group.pub) }}</p>
          </div>
        </div>
      </div>
      <div class="gameboy">
        <div class="card-reader">
          <div class="status-dot" :style="{ backgroundColor: statusDotColor }"></div>
        </div>
        <div class="gameboy-screen">
          <div class="screen-content">
            <img v-if="showQRCode && qrcode" :src="qrcode" class="qrcode-image" />
            <pre v-else-if="centeredCard">{{ JSON.stringify(selectedKeyPair, null, 2) }}</pre>
            <p v-else class="placeholder">TalkFlow</p>
          </div>
        </div>
        <div class="gameboy-buttons">
          <button
            class="gameboy-button action "
            :class="{ disabled: isAtLeftEdge }"
            @click="debouncedScrollLeft"
            :disabled="isAtLeftEdge"
          >
            <ion-icon :icon="arrowBackOutline"></ion-icon>
          </button>
          <button
            class="gameboy-button action "
            :class="{ disabled: isAtRightEdge }"
            @click="debouncedScrollRight"
            :disabled="isAtRightEdge"
          >
            <ion-icon :icon="arrowForwardOutline"></ion-icon>
          </button>
          <button
            class="gameboy-button action purple"
            :class="{ disabled: !centeredCard }"
            @click="toggleQRCode"
            :disabled="!centeredCard"
          >
            <ion-icon :icon="qrCodeOutline"></ion-icon>
          </button>
          <button
            class="gameboy-button action green"
            :class="{ disabled: !centeredCard }"
            @click="copyKeyPairWithToast(selectedKeyPair)"
            :disabled="!centeredCard"
          >
            <ion-icon :icon="copyOutline"></ion-icon>
          </button>
          <button
            class="gameboy-button action red"
            :class="{ disabled: !centeredCard }"
            @click="confirmDelete(centeredCard?.pub)"
            :disabled="!centeredCard"
          >
            <ion-icon :icon="trashOutline"></ion-icon>
          </button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonIcon,
  alertController,
  toastController,
} from '@ionic/vue';
import { useGroupChat } from '@/composables/useGroupChat';
import { useRouter } from 'vue-router';
import { ref, computed, onMounted, watch, shallowRef } from 'vue';
import { chevronBackOutline, copyOutline, trashOutline, arrowBackOutline, arrowForwardOutline, qrCodeOutline } from 'ionicons/icons';
import { debounce } from 'lodash';
import { useQR } from "@gun-vue/composables";

const router = useRouter();
const { groups, copyKeyPair, deleteGroup, loadGroups } = useGroupChat();

const centeredCard = ref<{ pub: string; index: number } | null>(null);
const cardContainer = ref<HTMLElement | null>(null);
const isAtLeftEdge = ref(true);
const isAtRightEdge = ref(false);
const showQRCode = ref(false);
const statusDotColor = ref('#ff0000');

const selectedKeyPair = computed(() => {
  if (!centeredCard.value) return null;
  const group = groups.value.find(g => g.pub === centeredCard.value?.pub);
  return group ? group.pair : null;
});

const keyPairText = shallowRef('');
const qrcode = useQR(keyPairText);

watch(selectedKeyPair, (newValue) => {
  keyPairText.value = newValue ? JSON.stringify(newValue, null, 2) : '';
});

watch(centeredCard, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    statusDotColor.value = '#0000ff';
    setTimeout(() => {
      statusDotColor.value = newValue ? '#00ff00' : '#ff0000';
    }, 200);
  }
});

const formatPubKey = (pub: string) => {
  return pub.length > 6 ? `${pub.slice(0, 6)}...` : pub;
};

const getCardWidth = () => {
  if (!cardContainer.value) return 300;
  const card = cardContainer.value.querySelector('.card') as HTMLElement | null;
  if (!card) return 300;
  const style = window.getComputedStyle(card);
  const width = card.offsetWidth;
  const marginRight = parseFloat(style.marginRight) || 0;
  return width + marginRight;
};

const updateEdgeStatus = () => {
  if (!cardContainer.value) {
    isAtLeftEdge.value = true;
    isAtRightEdge.value = true;
    return;
  }
  const { scrollLeft, scrollWidth, clientWidth } = cardContainer.value;
  isAtLeftEdge.value = scrollLeft <= 0;
  isAtRightEdge.value = scrollLeft + clientWidth >= scrollWidth - 1;
};

const updateCenteredCard = () => {
  if (!cardContainer.value) {
    centeredCard.value = null;
    updateEdgeStatus();
    return;
  }
  const containerRect = cardContainer.value.getBoundingClientRect();
  const containerCenter = containerRect.left + containerRect.width / 2;
  let closestCard: { pub: string; index: number; distance: number } | null = null;
  const cards = cardContainer.value.querySelectorAll('.card');
  if (cards.length === 0) {
    centeredCard.value = null;
    updateEdgeStatus();
    return;
  }
  for (const [index, card] of Array.from(cards).entries()) {
    const cardRect = (card as HTMLElement).getBoundingClientRect();
    const cardCenter = cardRect.left + cardRect.width / 2;
    const distance = Math.abs(cardCenter - containerCenter);
    const pub = card.getAttribute('data-pub');
    if (pub) {
      if (closestCard === null || distance < closestCard.distance) {
        closestCard = { pub, index, distance };
      }
    }
  }
  if (closestCard) {
    centeredCard.value = { pub: closestCard.pub, index: closestCard.index };
  } else {
    centeredCard.value = null;
  }
  updateEdgeStatus();
};

const scrollLeft = () => {
  if (cardContainer.value && !isAtLeftEdge.value) {
    const cardWidth = getCardWidth();
    cardContainer.value.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    setTimeout(() => {
      updateCenteredCard();
      updateEdgeStatus();
    }, 300);
  }
};

const scrollRight = () => {
  if (cardContainer.value && !isAtRightEdge.value) {
    const cardWidth = getCardWidth();
    cardContainer.value.scrollBy({ left: cardWidth, behavior: 'smooth' });
    setTimeout(() => {
      updateCenteredCard();
      updateEdgeStatus();
    }, 300);
  }
};

const debouncedScrollLeft = debounce(scrollLeft, 300, { leading: true, trailing: false });
const debouncedScrollRight = debounce(scrollRight, 300, { leading: true, trailing: false });

const toggleQRCode = () => {
  showQRCode.value = !showQRCode.value;
};

const goBack = () => {
  router.go(-1);
};

const copyKeyPairWithToast = async (pair: any) => {
  if (!pair) return;
  try {
    await copyKeyPair(pair);
  } catch (error) {
    console.error('复制密钥对失败:', error);
    const toast = await toastController.create({
      message: '复制密钥对失败',
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
};

const confirmDelete = async (pub: string | undefined) => {
  if (!pub) return;
  const alert = await alertController.create({
    header: '确认删除',
    message: `确定要删除群 ${groups.value.find(g => g.pub === pub)?.name || pub} 的密钥对吗？此操作不可撤销。`,
    buttons: [
      { text: '取消', role: 'cancel' },
      {
        text: '删除',
        role: 'destructive',
        handler: async () => {
          try {
            await deleteGroup(pub);
            centeredCard.value = null;
            const toast = await toastController.create({
              message: '群密钥对已删除',
              duration: 2000,
              position: 'top',
              color: 'success',
            });
            await toast.present();
            setTimeout(updateCenteredCard, 100);
          } catch (error) {
            console.error('删除群失败:', error);
            const toast = await toastController.create({
              message: '删除群失败',
              duration: 2000,
              position: 'top',
              color: 'danger',
            });
            await toast.present();
          }
        },
      },
    ],
  });
  await alert.present();
};

import { gunAvatar, mountClass } from "gun-avatar";
mountClass();
const { isDark } = useTheme();

onMounted(() => {
  loadGroups();
  setTimeout(() => {
    updateCenteredCard();
    updateEdgeStatus();
    statusDotColor.value = centeredCard.value ? '#00ff00' : '#ff0000';
  }, 100);
});
</script>

<style scoped>
.gun-avatar {
  position: absolute;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  border-radius: 12px;
  z-index: -1;
}
.group-name {
  font-size: 39px;
  font-weight: 600;
  color: var(--ion-color-dark);
  margin-bottom: 8px;
  position: absolute;
  bottom: 0;
  right: 15px;
}
.group-pubkey {
  font-size: 12px;
  color: var(--ion-color-medium);
  cursor: pointer;
  position: absolute;
  top: 0;
  left: 5px;
}
.card-container {
  width: 100%;
  height: 200px;
  display: flex;
  overflow-x: auto;
  white-space: nowrap;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  padding: 0 100px;
  scrollbar-width: none;
}
.card-container::-webkit-scrollbar {
  display: none;
}
.card {
  display: inline-block;
  padding: 90px 150px;
  border-radius: 12px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  margin-right: 10px;
  scroll-snap-align: center;
  flex-shrink: 0;
}
.card:hover {
  transform: translateY(-10px) scale(1.05);
}
.card-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.gameboy {
  width: 300px;
  height: 350px;
  background: #d3d3d3;
  border-radius: 20px 20px 60px 20px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2), inset 0 2px 5px rgba(255, 255, 255, 0.5);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10px auto;
}
.card-reader {
  width: 130px;
  height: 39px;
  background: #b0b0b0;
  border-radius: 5px;
  position: absolute;
  top: -16px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  position: relative;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  transition: background-color 0.3s ease;
}
.gameboy-screen {
  width: 200px;
  height: 300px;
  background: #2b2b2b;
  border: 10px solid #8b8b8b;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}
.gameboy-screen:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.05) 0,
    rgba(255, 255, 255, 0.05) 2px,
    transparent 2px,
    transparent 4px
  );
  pointer-events: none;
}
.screen-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 10px;
  color: #c0c0c0;
  font-family: monospace;
  font-size: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.screen-content .placeholder {
  margin: 0;
  text-align: center;
  color: #888;
  font-style: italic;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.screen-content .qrcode-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.gameboy-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px;
  justify-content: center;
}
.gameboy-button {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  border: none;
  outline: none;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.gameboy-button ion-icon {
  font-size: 20px;
  color: #fff;
}
.gameboy-button.directional {
  background: linear-gradient(145deg, #4a4a4a, #2e2e2e);
  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.4), -3px -_category3px 6px rgba(255, 255, 255, 0.1);
}
.gameboy-button.action.purple {
  background: linear-gradient(145deg, #7044ff, #5a38cc);
  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.1);
}
.gameboy-button.action.green {
  background: linear-gradient(145deg, #01b893, #009978);
  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.1);
}
.gameboy-button.action.red {
  background: linear-gradient(145deg, #ff0055, #cc0041);
  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.4), -3px -3px -category3px 6px rgba(255, 255, 255, 0.1);
}
.gameboy-button:active:not(.disabled) {
  transform: translateY(2px);
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.4), -1px -1px 3px rgba(255, 255, 255, 0.1);
}
.gameboy-button.disabled {
  background: linear-gradient(145deg, #888, #666);
  box-shadow: none;
  cursor: not-allowed;
}
.gameboy-button.disabled ion-icon {
  color: #ccc;
}
@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.card {
  animation: cardFadeIn 0.5s ease forwards;
}
</style>