<template>
    <div class="glass-card">
      <slot name="header"></slot>
      <slot name="content"></slot>
      <slot name="footer"></slot>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent } from 'vue';
  
  export default defineComponent({
    name: 'GlassCard'
  });
  </script>
  
  <style scoped>
  .glass-card {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 20px;
    margin: 20px 0;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
  </style>