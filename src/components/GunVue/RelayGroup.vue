<template>

  <div class="group-manager">
    <div class="controls">
      <input v-model="newGroupName" placeholder="Enter relay group name, e.g.: Office Network" @keyup.enter="createGroup" />
      <ion-button size="small" fill="outline" @click="createGroup">Create Relay Group</ion-button>
    </div>
    <div class="tips">Custom groups are completely isolated from the default group. Enabling a group will create a new communication instance using the nodes within that group.</div>
  </div>

  <ion-accordion-group>
    <ion-accordion value="first">
      <ion-item slot="header" color="light">
        <ion-label>
          Main Network
          <span class="count-tag" v-if="statsMain">（{{ statsMain.enabled }} / {{ statsMain.total }}）</span>
          <span v-if="mainEnabled" class="enabled-tag">(Enabled)</span>
        </ion-label>
      </ion-item>
      <div class="ion-padding" slot="content">
        <RelayMode 
          :enabled="mainEnabled"
          @toggleMainEnabled="onToggleMainEnabled"
          @stats="updateMainStats"
        />
      </div>
    </ion-accordion>

    <!-- 动态自定义群组 -->
    <ion-accordion v-for="g in groups" :key="g.id" :value="g.id">
      <ion-item slot="header" color="light">
        <ion-icon :icon="createOutline" class="edit-icon" @click.stop="startRename(g)" />
        <ion-label>
          {{ g.name }}
          <span class="count-tag" v-if="stats[g.id]">（{{ stats[g.id].enabled }} / {{ stats[g.id].total }}）</span>
          <span v-if="g.enabled" class="enabled-tag">(Enabled)</span>
        </ion-label>
      </ion-item>
      <div class="ion-padding" slot="content">
        <CustomRelayMode 
          :group="g" 
          @rename="renameGroup" 
          @toggleEnabled="toggleGroupEnabled" 
          @delete="deleteGroup"
          @stats="updateStats"
        />
      </div>
    </ion-accordion>

  </ion-accordion-group>

  <div style="height: 300px;">

  </div>
</template>

<script setup lang="ts">
  import { IonAccordion, IonAccordionGroup, IonItem, IonLabel, IonButton, IonIcon } from '@ionic/vue';
  import { ref, onMounted, watch } from 'vue';
  import { createOutline } from 'ionicons/icons';
  import { recreateGunWithPeers } from '@/composables/useGun';
  import RelayMode from './RelayMode.vue';
  import CustomRelayMode from './CustomRelayMode.vue';

  type Group = { id: string; name: string; enabled: boolean };

  const STORAGE_KEY = 'gun_custom_groups_v1';
  const MAIN_ENABLED_KEY = 'gun_main_enabled';

  const groups = ref<Group[]>([]);
  const newGroupName = ref('');

  type Stats = { enabled: number; total: number };
  const stats = ref<Record<string, Stats>>({});

  const statsMain = ref<Stats | null>(null);
  const mainEnabled = ref<boolean>(true);

  function updateMainStats(id: string, enabled: number, total: number) {
    if (id !== 'main') return;
    statsMain.value = { enabled, total };
    recomputeAndApplyPeers();
  }
  function onToggleMainEnabled(enabled: boolean) {
    mainEnabled.value = !!enabled;
    try { localStorage.setItem(MAIN_ENABLED_KEY, JSON.stringify(mainEnabled.value)); } catch {}
    recomputeAndApplyPeers();
  }

  function updateStats(id: string, enabled: number, total: number) {
    stats.value = { ...stats.value, [id]: { enabled, total } };
    // 统计变化后也尝试合并并应用连接（覆盖式重建Gun实例）
    recomputeAndApplyPeers();
  }

  function loadGroups() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      groups.value = s ? JSON.parse(s) : [];
    } catch { groups.value = []; }
  }
  function saveGroups() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(groups.value)); } catch {}
  }

  // 读取默认主网络启用的节点（不再回退到全部列表）
  function getDefaultEnabledPeers(): string[] {
    try {
      const s = localStorage.getItem('gun_enabled_peers');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }

  // 读取某个自定义群组启用的节点
  function getGroupEnabledPeers(id: string): string[] {
    try {
      const key = `gun_group_${id}_enabled_peers`;
      const s = localStorage.getItem(key);
      const parsed = s ? JSON.parse(s) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  // 合并默认主网络与所有启用的自定义群组的节点，并重建Gun实例
  function recomputeAndApplyPeers() {
    const union = new Set<string>();
    // 默认主网络 peers（仅当主网络启用时才合并）
    if (mainEnabled.value) {
      for (const p of getDefaultEnabledPeers()) union.add(p);
    }
    // 所有已启用的自定义群组 peers
    for (const g of groups.value) {
      if (!g.enabled) continue;
      for (const p of getGroupEnabledPeers(g.id)) union.add(p);
    }
    const finalPeers = Array.from(union).filter(Boolean);
    if (finalPeers.length > 0) {
      recreateGunWithPeers(finalPeers);
    } else {
      // 若没有任何启用的节点，也应重建为空集合，确保旧连接断开
      recreateGunWithPeers([]);
    }
  }

  onMounted(() => {
    loadGroups();
    try { mainEnabled.value = JSON.parse(localStorage.getItem(MAIN_ENABLED_KEY) || 'true'); } catch { mainEnabled.value = true; }
    // 不在这里立即 recompute，等待子组件挂载并通过 stats 回传后再合并，避免使用旧的本地启用缓存
  });
  watch(groups, () => { saveGroups(); }, { deep: true });

  function createGroup() {
    const name = (newGroupName.value || '').trim();
    const id = `g_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    groups.value.push({ id, name: name || 'Unnamed Group', enabled: true });
    newGroupName.value = '';
    // 新建群组默认启用时，合并并应用一次
    recomputeAndApplyPeers();
  }

  function renameGroup(id: string, name: string) {
    const g = groups.value.find(x => x.id === id); if (!g) return; g.name = name;
  }

  function startRename(g: Group) {
    const name = prompt('Edit group name', g.name);
    if (name != null) {
      const n = name.trim();
      if (n) renameGroup(g.id, n);
    }
  }

  function toggleGroupEnabled(id: string, enabled: boolean) {
    // 允许多个自定义群组同时启用：只更新目标群组的启用状态，不更改其他群组
    groups.value = groups.value.map(g => g.id === id ? { ...g, enabled } : g);
    // 启用状态变更后，合并并应用一次
    recomputeAndApplyPeers();
  }

  function deleteGroup(id: string) {
    groups.value = groups.value.filter(g => g.id !== id);
    // 删除群组后，合并并应用一次
    recomputeAndApplyPeers();
  }
</script>

<style scoped>
.group-manager { margin-bottom: 12px; padding: 8px;  border-radius: 8px; }
.controls { display: flex; gap: 8px; align-items: center; }
.controls input { flex: 1; padding: 6px 8px; border: 1px solid var(--ion-color-medium); border-radius: 6px; }
.tips { margin-top: 6px; color: var(--ion-color-medium); font-size: 12px; }
.enabled-tag { color: var(--ion-color-success); font-size: 12px; margin-left: 6px; }
.count-tag { color: var(--ion-color-medium); font-size: 12px; margin-left: 6px; }
.edit-icon { margin-right: 8px; font-size: 18px; color: var(--ion-color-medium); cursor: pointer; }
.edit-icon:hover { color: var(--ion-color-primary); }
</style>