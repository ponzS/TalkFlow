<template>
    <div class="window-controls" @mousedown="startDrag">
      <div class="control-buttons">
        <div class="control-button close" @click="closeWindow"></div>
        <div class="control-button minimize" @click="minimizeWindow"></div>
        <div class="control-button maximize" @click="toggleMaximize"></div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { getCurrentWindow, Window } from '@tauri-apps/api/window';
  
  // Get the current window instance
  const appWindow: Window = getCurrentWindow();
  const isMaximized = ref(false);
  
  // Close window
  function closeWindow() {
    appWindow.close();
  };
  
  // Minimize window
  function minimizeWindow() {
    appWindow.minimize();
  };
  
  // Toggle maximize/restore
  function toggleMaximize() {
    if (isMaximized.value) {
      appWindow.unmaximize();
    } else {
       appWindow.maximize();
    }
    isMaximized.value = !isMaximized.value;
  };
  
  // Start dragging
  function startDrag() {
    appWindow.startDragging();
  };
  </script>
  
  <style scoped>
  .window-controls {
    display: flex;
    align-items: center;
    height: 30px;
    background: transparent;
    /* background: linear-gradient(to bottom, #e0e0e0, #d0d0d0); */
    -webkit-app-region: drag; /* Tauri drag region */
    user-select: none;
    padding: 0 10px;
    z-index: 9999;
  }
  
  .control-buttons {
    display: flex;
    gap: 8px;
  }
  
  .control-button {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .close {
    background: #ff5f57;
  }
  
  .close:hover {
    background: #e04e46;
  }
  
  .minimize {
    background: #ffbd2e;
  }
  
  .minimize:hover {
    background: #e0a626;
  }
  
  .maximize {
    background: #28c940;
  }
  
  .maximize:hover {
    background: #23b338;
  }
  </style>