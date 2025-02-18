<template>
    <ion-segment>
      <ion-segment-button value="first" content-id="first">
        <ion-label>First</ion-label>
      </ion-segment-button>
      <ion-segment-button value="second" content-id="second">
        <ion-label>Second</ion-label>
      </ion-segment-button>
      <ion-segment-button value="third" content-id="third">
        <ion-label>Third</ion-label>
      </ion-segment-button>
    </ion-segment>
    <div v-if="selectedSegment === 'first'">
    <p>This is the first segment</p>
  </div>
  <div v-if="selectedSegment === 'second'">
    <p>This is the second segment</p>
  </div>
  <div v-if="selectedSegment === 'third'">
    <p>This is the second segment</p>
  </div>
  </template>
  
  <style>
    ion-segment-view {
      height: 150px;
    }
  
    ion-segment-content {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    ion-segment-content:nth-of-type(1) {
      background: lightpink;
    }
    ion-segment-content:nth-of-type(2) {
      background: lightblue;
    }
    ion-segment-content:nth-of-type(3) {
      background: lightgreen;
    }
  </style>
  
  <script setup lang="ts">
    import { IonLabel, IonSegment, IonSegmentButton,  } from '@ionic/vue';

    const selectedSegment = ref('first');
 


  </script>