<template>
    <div class="particle-background">
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
     
    </div>
  </template>
  
  <style scoped>
  .particle-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    
    pointer-events: none; 
  }
  
  .particle {
    position: absolute;
    width: 5px;
    height: 5px;
    background-color: rgba(0, 255, 234, 0.7); /* 霓虹色 */
    border-radius: 50%;
    animation: moveUp 10s infinite linear, fadeOut 10s infinite linear;
  }
  
  .particle:nth-child(1) {
    top: 100%;
    left: 10%;
    animation-delay: 0s;
  }
  
  .particle:nth-child(2) {
    top: 100%;
    left: 50%;
    animation-delay: 2s;
  }
  
  .particle:nth-child(3) {
    top: 100%;
    left: 30%;
    animation-delay: 4s;
  }
  .particle:nth-child(4) {
    top: 100%;
    left: 70%;
    animation-delay: 6s;
  }
  .particle:nth-child(5) {
    top: 100%;
    left: 20%;
    animation-delay: 7s;
  }
  .particle:nth-child(6) {
    top: 100%;
    left: 60%;
    animation-delay: 8s;
  }
  @keyframes moveUp {
    0% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(-100vh);
    }
  }
  
  @keyframes fadeOut {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  </style>
  