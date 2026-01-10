<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/settingspage" />
        </ion-buttons>
        <ion-title>{{ $t('modelPersona.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list>
        <ion-item lines="full">
          <ion-label>
            <h2>{{ $t('modelPersona.currentModel.label') }}</h2>
            <p>{{ modelId }}</p>
          </ion-label>
        </ion-item>

        <ion-item lines="full">
          <ion-label>
            <h2>{{ $t('modelPersona.personaSegments.label') }}</h2>
            <p>{{ $t('modelPersona.personaSegments.tip') }}</p>
          </ion-label>

        </ion-item>
          <ion-item lines="full">
        
          <ion-button slot="end" fill="outline" color="primary" @click="addSegment('system')">{{ $t('modelPersona.personaSegments.addSystem') }}</ion-button>
          <ion-button slot="end" fill="outline" color="primary" @click="addSegment('user')">{{ $t('modelPersona.personaSegments.addUser') }}</ion-button>
          <ion-button slot="end" fill="outline" color="primary" @click="addSegment('assistant')">{{ $t('modelPersona.personaSegments.addAssistant') }}</ion-button>
        </ion-item>

        <ion-item v-for="(seg, idx) in personaRecipe" :key="idx" lines="full">
          <div class="segment-row">
            <div class="segment-role">
              <ion-select :value="seg.role" @ionChange="(e) => onRoleChange(idx, e)" interface="popover">
                <ion-select-option value="system">system</ion-select-option>
                <ion-select-option value="user">user</ion-select-option>
                <ion-select-option value="assistant">assistant</ion-select-option>
              </ion-select>
            </div>
            <div class="segment-text">
              <ion-textarea
                :value="seg.content"
                @ionInput="(e) => onTextInput(idx, e)"
                :placeholder="$t('modelPersona.segment.placeholder')"
                :rows="4"
                :autoGrow="true"
              />
            </div>
            <div class="segment-actions">
              <ion-button size="small" color="medium" fill="outline" @click="moveUp(idx)">{{ $t('modelPersona.segment.actions.moveUp') }}</ion-button>
              <ion-button size="small" color="medium" fill="outline" @click="moveDown(idx)">{{ $t('modelPersona.segment.actions.moveDown') }}</ion-button>
              <ion-button size="small" color="danger" fill="outline" @click="removeSegment(idx)">{{ $t('modelPersona.segment.actions.remove') }}</ion-button>
            </div>
          </div>
        </ion-item>

        <ion-item lines="full">
          <ion-label>
            <h2>{{ $t('modelPersona.systemPrompt.label') }}</h2>
            <p>{{ $t('modelPersona.systemPrompt.tip') }}</p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-textarea
            :value="systemPersona"
            @ionInput="onSystemPersonaInput"
            :placeholder="$t('modelPersona.systemPrompt.placeholder')"
            :rows="5"
            :autoGrow="true"
          />
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonTextarea,
  IonSelect,
  IonSelectOption,
} from '@ionic/vue';
import { useWebLLMChat } from '@/composables/useWebLLMChat';

const {
  modelId,
  systemPersona,
  setSystemPersona,
  personaRecipe,
  addPersonaSegment,
  updatePersonaSegment,
  removePersonaSegment,
  movePersonaSegment,
} = useWebLLMChat();

const onSystemPersonaInput = (ev: any) => {
  const val = ev?.detail?.value ?? ev?.target?.value ?? '';
  setSystemPersona(String(val || ''));
};

const addSegment = (role: 'system' | 'user' | 'assistant') => {
  addPersonaSegment(role, '');
};
const onRoleChange = (idx: number, ev: any) => {
  const role = String(ev?.detail?.value ?? ev?.target?.value ?? 'system') as 'system' | 'user' | 'assistant';
  updatePersonaSegment(idx, { role });
};
const onTextInput = (idx: number, ev: any) => {
  const val = ev?.detail?.value ?? ev?.target?.value ?? '';
  updatePersonaSegment(idx, { content: String(val || '') });
};
const removeSegment = (idx: number) => removePersonaSegment(idx);
const moveUp = (idx: number) => movePersonaSegment(idx, Math.max(0, idx - 1));
const moveDown = (idx: number) => movePersonaSegment(idx, Math.min(personaRecipe.value.length - 1, idx + 1));

</script>

<style scoped>
.segment-row { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.segment-role { max-width: 160px; }
.segment-text { width: 100%; }
.segment-actions { display: flex; gap: 8px; }
</style>