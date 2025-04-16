<script setup>
import { useQRCode } from '@vueuse/integrations/useQRCode';

const props = defineProps({
  data: { type: String, default: '' },
  size: { type: Number, default: 400 },
  margin: { type: Number, default: 1 }
});

const qrcode = useQRCode(() => props.data, {
  errorCorrectionLevel: 'Q',
  scale: 8,
  margin: 4
});
</script>

<template>
  <div style="padding: 0px;">
    <img class="liquid-qr" :src="qrcode" alt="QR Code" />
    <p class="talkflow-title-text"><span style="color: black">Talk</span><span>Flow</span></p>
  </div>
</template>

<style scoped>
.liquid-qr {
  max-width: 100%;
  border-radius: 20px;
 
  padding: 10px;

  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
  animation: ripple 4s infinite;
}

.liquid-qr:hover {
  transform: scale(1.05);
}

@keyframes ripple {
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.3); }
  50% { box-shadow: 0 0 20px 10px rgba(255, 255, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}


.talkflow-title-text {
  text-align: center;
  font-size: 39px;
  font-weight: bold;
  color: transparent;
  text-shadow: 0 0 10px 0 rgba(0, 255, 217, 0.5);
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0);
  background: linear-gradient(-45deg, #52eed1, #000000, #23d5b4, #23d5ab);
  -webkit-background-clip: text;
  background-clip: text;
  z-index: 9999;
  background-size: 200% 200%;
  animation: gradientBreath 10s ease infinite;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
}

@keyframes gradientBreath {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>