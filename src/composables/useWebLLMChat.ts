import { CreateMLCEngine } from '@mlc-ai/web-llm';
import { Preferences } from '@capacitor/preferences';

export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: number;
  streaming?: boolean;
}

interface InitProgressInfo {
  progress?: number; // 0..1
  text?: string;
}


// 内置模型列表：从 WebLLM 预置配置派生，避免手动硬编码
// 仅展示基本信息（id 与可读名），保持与 web-llm-chat 一致的来源
import { prebuiltAppConfig } from '@mlc-ai/web-llm';



const DEFAULT_MODEL_ID = 'SmolLM2-135M-Instruct-q0f32-MLC';

// 使用 model_id 作为显示名称，避免访问不存在的 display_name 属性
const builtInModels = prebuiltAppConfig.model_list.map((m) => ({
  id: m.model_id,
  name: m.model_id,
  sizeMB: '',
  notes: '',
}));

// 全局（单例）引擎实例，避免在不同页面重复初始化与下载模型
const engineRef = shallowRef<any | null>(null);

// 自动回复设置（持久化到 localStorage）
const AUTO_REPLY_ALL_KEY = 'webllm_auto_reply_all_enabled';
const TARGETED_REPLY_ENABLED_KEY = 'webllm_targeted_reply_enabled';
const TARGETED_BUDDIES_KEY = 'webllm_targeted_buddies';

const autoReplyAllEnabled = ref<boolean>((localStorage.getItem(AUTO_REPLY_ALL_KEY) ?? 'false') === 'true');
const targetedReplyEnabled = ref<boolean>((localStorage.getItem(TARGETED_REPLY_ENABLED_KEY) ?? 'false') === 'true');
const targetedBuddyPubs = ref<string[]>((() => {
  try {
    const raw = localStorage.getItem(TARGETED_BUDDIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
})());

function setAutoReplyAllEnabled(v: boolean) {
  autoReplyAllEnabled.value = !!v;
  localStorage.setItem(AUTO_REPLY_ALL_KEY, v ? 'true' : 'false');
}
function setTargetedReplyEnabled(v: boolean) {
  targetedReplyEnabled.value = !!v;
  localStorage.setItem(TARGETED_REPLY_ENABLED_KEY, v ? 'true' : 'false');
}
function setTargetedBuddyPubs(pubs: string[]) {
  const uniq = Array.from(new Set(pubs || []));
  targetedBuddyPubs.value = uniq;
  localStorage.setItem(TARGETED_BUDDIES_KEY, JSON.stringify(uniq));
}
function isAutoReplyEnabledForBuddy(pub: string): boolean {
  // 两个选项同时启用时，优先采用针对性回复的设置
  if (targetedReplyEnabled.value) {
    return targetedBuddyPubs.value.includes(pub);
  }
  return autoReplyAllEnabled.value;
}

export function useWebLLMChat() {
  const engine = engineRef;
  const isInitializing = ref(false);
  const initProgress: Ref<InitProgressInfo | null> = ref(null);
  const MODEL_PREF_KEY = 'webllm_last_model_id';
  const modelId = ref<string>((() => {
    const saved = localStorage.getItem(MODEL_PREF_KEY);
    return saved || DEFAULT_MODEL_ID;
  })());

  (async () => {
    try {
      const { value } = await Preferences.get({ key: MODEL_PREF_KEY });
      if (value && typeof value === 'string') {
        modelId.value = value;
      }
    } catch {}
  })();

  const messages = ref<ChatMessage[]>([
    // { role: 'system', content: 'You are a helpful AI assistant.', timestamp: Date.now() },
  ]);

  // 系统角色（Persona），用于给当前模型赋予灵魂（持久化）
  const SYSTEM_PERSONA_KEY = 'webllm_system_persona';
  const systemPersona = ref<string>(localStorage.getItem(SYSTEM_PERSONA_KEY) || '');
  function setSystemPersona(text: string) {
    const v = String(text || '');
    systemPersona.value = v;
    localStorage.setItem(SYSTEM_PERSONA_KEY, v);
  }

  // 组合预设段（可包含多段 system/user/assistant），持久化
  type PersonaSegment = { role: ChatRole; content: string };
  const PERSONA_RECIPE_KEY = 'webllm_persona_recipe';
  const personaRecipe = ref<PersonaSegment[]>((() => {
    try {
      const raw = localStorage.getItem(PERSONA_RECIPE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const validRoles: ChatRole[] = ['system', 'user', 'assistant'];
      return Array.isArray(arr)
        ? arr
            .filter((s: any) => s && typeof s.content === 'string' && validRoles.includes(s.role))
            .map((s: any) => ({ role: s.role as ChatRole, content: String(s.content || '') }))
        : [];
    } catch {
      return [];
    }
  })());
  function persistPersonaRecipe() {
    localStorage.setItem(PERSONA_RECIPE_KEY, JSON.stringify(personaRecipe.value));
  }
  function setPersonaRecipe(list: PersonaSegment[]) {
    const validRoles: ChatRole[] = ['system', 'user', 'assistant'];
    personaRecipe.value = Array.from(list || [])
      .filter(s => s && typeof s.content === 'string' && validRoles.includes(s.role))
      .map(s => ({ role: s.role, content: String(s.content || '') }));
    persistPersonaRecipe();
  }
  function addPersonaSegment(role: ChatRole = 'system', content = '') {
    personaRecipe.value.push({ role, content: String(content || '') });
    // 强制触发响应式更新
    personaRecipe.value = [...personaRecipe.value];
    persistPersonaRecipe();
  }
  function updatePersonaSegment(index: number, patch: Partial<PersonaSegment>) {
    if (index >= 0 && index < personaRecipe.value.length) {
      const cur = personaRecipe.value[index];
      const next: PersonaSegment = {
        role: (patch.role ?? cur.role) as ChatRole,
        content: String(patch.content ?? cur.content ?? ''),
      };
      personaRecipe.value[index] = next;
      personaRecipe.value = [...personaRecipe.value];
      persistPersonaRecipe();
    }
  }
  function removePersonaSegment(index: number) {
    if (index >= 0 && index < personaRecipe.value.length) {
      personaRecipe.value.splice(index, 1);
      personaRecipe.value = [...personaRecipe.value];
      persistPersonaRecipe();
    }
  }
  function movePersonaSegment(from: number, to: number) {
    if (from === to) return;
    const len = personaRecipe.value.length;
    if (from < 0 || from >= len || to < 0 || to >= len) return;
    const [seg] = personaRecipe.value.splice(from, 1);
    personaRecipe.value.splice(to, 0, seg);
    personaRecipe.value = [...personaRecipe.value];
    persistPersonaRecipe();
  }

  // 角色预设（持久化数组）
  const PERSONA_PRESETS_KEY = 'webllm_persona_presets';
  const personaPresets = ref<string[]>((() => {
    try {
      const raw = localStorage.getItem(PERSONA_PRESETS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [];
    } catch {
      return [];
    }
  })());
  function persistPersonaPresets() {
    localStorage.setItem(PERSONA_PRESETS_KEY, JSON.stringify(personaPresets.value));
  }
  function setPersonaPresets(list: string[]) {
    personaPresets.value = Array.from(list || []).map(x => String(x || ''));
    persistPersonaPresets();
  }
  function addPersonaPreset(text = '') {
    personaPresets.value.push(String(text || ''));
    persistPersonaPresets();
  }
  function updatePersonaPreset(index: number, text: string) {
    if (index >= 0 && index < personaPresets.value.length) {
      personaPresets.value[index] = String(text || '');
      persistPersonaPresets();
    }
  }
  function removePersonaPreset(index: number) {
    if (index >= 0 && index < personaPresets.value.length) {
      personaPresets.value.splice(index, 1);
      persistPersonaPresets();
    }
  }

  const isStreaming = ref(false);
  const abortController = ref<AbortController | null>(null);

  const hasWebGPU = computed(() => typeof (navigator as any).gpu !== 'undefined');
  // 运行模式偏好（auto/gpu/cpu），用于 UI 选择与指示
  const runtimePreference = ref<'auto' | 'gpu' | 'cpu'>(
    (localStorage.getItem('webllm_runtime_pref') as any) || 'auto'
  );
  function setRuntimePreference(pref: 'auto' | 'gpu' | 'cpu') {
    runtimePreference.value = pref;
    localStorage.setItem('webllm_runtime_pref', pref);
  }
  const runtimeMode = computed(() => {
    if (runtimePreference.value === 'gpu') return hasWebGPU.value ? 'GPU' : 'CPU';
    if (runtimePreference.value === 'cpu') return 'CPU';
    // auto
    return hasWebGPU.value ? 'GPU' : 'CPU';
  });

  // 生成参数（与 web-llm-chat 接近）
  const temperature = ref<number>(Number(localStorage.getItem('webllm_gen_temperature') ?? '0.7'));
  const topP = ref<number>(Number(localStorage.getItem('webllm_gen_top_p') ?? '0.9'));
  const maxTokens = ref<number>(Number(localStorage.getItem('webllm_gen_max_tokens') ?? '1024'));
  const presencePenalty = ref<number>(Number(localStorage.getItem('webllm_gen_presence_penalty') ?? '0'));
  const frequencyPenalty = ref<number>(Number(localStorage.getItem('webllm_gen_frequency_penalty') ?? '0'));
  const contextWindowSize = ref<number>(Number(localStorage.getItem('webllm_gen_context_window_size') ?? '4096'));
  const enableThinking = ref<boolean>((localStorage.getItem('webllm_enable_thinking') ?? 'false') === 'true');
  const logLevel = ref<string>(localStorage.getItem('webllm_log_level') ?? 'INFO');
  function setTemperature(v: number) {
    temperature.value = v; localStorage.setItem('webllm_gen_temperature', String(v));
  }
  function setTopP(v: number) {
    topP.value = v; localStorage.setItem('webllm_gen_top_p', String(v));
  }
  function setMaxTokens(v: number) {
    maxTokens.value = v; localStorage.setItem('webllm_gen_max_tokens', String(v));
  }
  function setPresencePenalty(v: number) {
    presencePenalty.value = v; localStorage.setItem('webllm_gen_presence_penalty', String(v));
  }
  function setFrequencyPenalty(v: number) {
    frequencyPenalty.value = v; localStorage.setItem('webllm_gen_frequency_penalty', String(v));
  }
  function setContextWindowSize(v: number) {
    contextWindowSize.value = v; localStorage.setItem('webllm_gen_context_window_size', String(v));
  }
  function setEnableThinking(v: boolean) {
    enableThinking.value = v; localStorage.setItem('webllm_enable_thinking', v ? 'true' : 'false');
  }
  function setLogLevel(v: string) {
    logLevel.value = v; localStorage.setItem('webllm_log_level', v);
  }

  // 兼容说明：旧的 preferGPU 已用 runtimePreference 替代

  // 已安装模型记录（本地持久化）
  const installedModels = ref<string[]>(
    (() => {
      try {
        const raw = localStorage.getItem('webllm_installed_models');
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })()
  );
  function persistInstalled() {
    localStorage.setItem('webllm_installed_models', JSON.stringify(installedModels.value));
  }
  function markModelInstalled(id: string) {
    if (!installedModels.value.includes(id)) {
      installedModels.value.push(id);
      persistInstalled();
    }
  }
  async function purgeModelCache(modelId: string) {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const reqs = await cache.keys();
        for (const req of reqs) {
          const url = req.url || '';
          if (url.includes(modelId)) {
            await cache.delete(req);
          }
        }
      }
    } catch (e) {
      // Best-effort, ignore errors
    }
  }
  async function removeInstalledModel(id: string) {
    installedModels.value = installedModels.value.filter(m => m !== id);
    persistInstalled();
    await purgeModelCache(id);
  }

  async function initEngine(customModelId?: string) {
    const selected = customModelId ?? modelId.value;
    isInitializing.value = true;
    initProgress.value = { progress: 0, text: 'Initializing...' };
    try {
      engine.value = await CreateMLCEngine(selected, {
        initProgressCallback: (p: any) => {
          // p may contain fields like progress, text
          initProgress.value = { progress: p?.progress ?? initProgress.value?.progress, text: p?.text };
        },
        // 注：当前 WebLLM 无显式禁用 WebGPU 的选项；此偏好仅用于 UI 告知
        logLevel: (logLevel.value as any) || 'INFO',
      });
      localStorage.setItem(MODEL_PREF_KEY, selected);
      try { await Preferences.set({ key: MODEL_PREF_KEY, value: selected }); } catch {}
      markModelInstalled(selected);
    } finally {
      isInitializing.value = false;
    }
  }

  async function reloadModel(newModelId: string) {
    modelId.value = newModelId;
    if (!engine.value) {
      await initEngine(newModelId);
      markModelInstalled(newModelId);
      localStorage.setItem(MODEL_PREF_KEY, newModelId);
      try { await Preferences.set({ key: MODEL_PREF_KEY, value: newModelId }); } catch {}
      return;
    }
    isInitializing.value = true;
    initProgress.value = { progress: 0, text: 'Loading model...' };
    try {
      await engine.value.reload(newModelId);
      markModelInstalled(newModelId);
      localStorage.setItem(MODEL_PREF_KEY, newModelId);
      try { await Preferences.set({ key: MODEL_PREF_KEY, value: newModelId }); } catch {}
    } finally {
      isInitializing.value = false;
    }
  }

  function clearChat() {
    messages.value = [
      // { role: 'system', content: 'You are a helpful AI assistant.', timestamp: Date.now() },
    ];
  }

  // 简单的图像附件支持（多模态）：仅保留一张图片的 dataURL
  const attachedImageDataUrl = ref<string | null>(null);
  async function attachImageFile(file: File) {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        attachedImageDataUrl.value = String(reader.result || '');
        resolve();
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  async function sendMessage(userText: string) {
    if (!userText?.trim()) return;

    // Append user message
    const now = Date.now();
    messages.value.push({ role: 'user', content: userText, timestamp: now });

    // If engine not ready, show a loading status message first
    if (!engine.value) {
      const loadingMsg: ChatMessage = {
        role: 'assistant',
        content: `Loading the model：${modelId.value}（Mode：${runtimeMode.value}）。`,
        timestamp: Date.now(),
        streaming: true,
      };
      messages.value.push(loadingMsg);
      const initPromise = initEngine();
      // Poll init progress and update loading message
      while (isInitializing.value) {
        const p = initProgress.value;
        const pct = typeof p?.progress === 'number' ? Math.round(p!.progress! * 100) : undefined;
        const desc = p?.text ? ` ${p.text}` : '';
        loadingMsg.content = `Loading the default model：${modelId.value}（Mode：${runtimeMode.value}）。${pct !== undefined ? `Progress：${pct}%` : ''}${desc}`.trim();
        messages.value = [...messages.value];
        await new Promise(r => setTimeout(r, 120));
        await nextTick();
      }
      await initPromise;
      loadingMsg.content += `\nThe default model loading is complete, and the thinking...`;
      loadingMsg.streaming = false;
      messages.value = [...messages.value];
      await nextTick();
    }

    // Prepare assistant streaming message
    const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now(), streaming: true };
    messages.value.push(assistantMsg);

    // Build OpenAI-style messages excluding the streaming placeholder
    // 仅传递非流式且非 assistant 的消息，确保最后一条为 user（或 system）
    let openAiMessages = messages.value
      .filter(m => !m.streaming && m.role !== 'assistant')
      .map(m => {
        if (m.role === 'user' && m.timestamp === now) {
          // 当前发送的最后一条用户消息，支持多模态
          if (attachedImageDataUrl.value) {
            return {
              role: m.role,
              content: [
                { type: 'text', text: m.content },
                { type: 'image_url', image_url: { url: attachedImageDataUrl.value } },
              ]
            } as any;
          }
        }
        return ({ role: m.role, content: m.content } as any);
      });

    // 组合预设段与系统提示注入到上下文最前（保证第一个为 system）
    const personaSystem: any[] = [];
    const personaOthers: any[] = [];
    if (systemPersona.value?.trim()) {
      personaSystem.push({ role: 'system', content: systemPersona.value.trim() } as any);
    }
    if (personaRecipe.value.length > 0) {
      for (const seg of personaRecipe.value) {
        if (seg?.content?.trim()) {
          const msg = { role: seg.role, content: seg.content.trim() } as any;
          if (seg.role === 'system') personaSystem.push(msg); else personaOthers.push(msg);
        }
      }
    }
    let personaMsgs: any[] = [...personaSystem, ...personaOthers];
    // 无论是否存在 persona 段，都要保证首条为 system
    if (personaMsgs.length === 0 || personaMsgs[0]?.role !== 'system') {
      personaMsgs = [{ role: 'system', content: 'You are a helpful AI assistant.' } as any, ...personaMsgs];
    }
    openAiMessages = [...personaMsgs, ...openAiMessages];

    abortController.value = new AbortController();
    isStreaming.value = true;
    try {
      // 针对 Qwen3 + 思维模式的推荐参数（与 web-llm-chat 保持一致）
      const isQwen3 = modelId.value.toLowerCase().startsWith('qwen3');
      const thinkingEnabled = enableThinking.value;
      const tmpTemperature = (isQwen3 && thinkingEnabled) ? 0.6 : temperature.value;
      const tmpTopP = (isQwen3 && thinkingEnabled) ? 0.95 : topP.value;

      const chunks = await engine.value.chat.completions.create({
        messages: openAiMessages,
        temperature: tmpTemperature,
        top_p: tmpTopP,
        max_tokens: maxTokens.value,
        presence_penalty: presencePenalty.value,
        frequency_penalty: frequencyPenalty.value,
        stream: true,
        stream_options: { include_usage: true },
        signal: abortController.value.signal,
      });

      for await (const chunk of chunks) {
        const delta = chunk?.choices?.[0]?.delta?.content || '';
        if (delta) {
          assistantMsg.content += delta;
          // 强制触发响应式更新，确保流式文字即时显示
          messages.value = [...messages.value];
          await nextTick();
        }
      }
    } catch (err: any) {
      // If aborted, just finish gracefully
      if (err?.name !== 'AbortError') {
        assistantMsg.content += `\n[Error] ${String(err?.message ?? err)}`;
      }
    } finally {
      isStreaming.value = false;
      assistantMsg.streaming = false;
      abortController.value = null;
      // 强制触发视图更新，确保移除闪烁样式
      messages.value = [...messages.value];
      await nextTick();
    }
  }

  function stopStreaming() {
    if (abortController.value) abortController.value.abort();
  }

  // 为核心逻辑提供的一次性生成方法（非流式）
  async function generateWebLLMReply(openAiMessages: Array<{ role: ChatRole; content: any }>): Promise<string> {
    // 确保引擎已初始化
    if (!engine.value) {
      await initEngine();
    }
    // 非流式场景也注入组合预设段与系统提示（保证第一个为 system）
    const personaSystem: any[] = [];
    const personaOthers: any[] = [];
    if (systemPersona.value?.trim()) {
      personaSystem.push({ role: 'system', content: systemPersona.value.trim() } as any);
    }
    if (personaRecipe.value.length > 0) {
      for (const seg of personaRecipe.value) {
        if (seg?.content?.trim()) {
          const msg = { role: seg.role, content: seg.content.trim() } as any;
          if (seg.role === 'system') personaSystem.push(msg); else personaOthers.push(msg);
        }
      }
    }
    let personaMsgs: any[] = [...personaSystem, ...personaOthers];
    // 无论是否存在 persona 段，都要保证首条为 system
    if (personaMsgs.length === 0 || personaMsgs[0]?.role !== 'system') {
      personaMsgs = [{ role: 'system', content: 'You are a helpful AI assistant.' } as any, ...personaMsgs];
    }
    openAiMessages = [...personaMsgs, ...openAiMessages];
    // 针对 Qwen3 + 思维模式的推荐参数
    const isQwen3 = modelId.value.toLowerCase().startsWith('qwen3');
    const thinkingEnabled = enableThinking.value;
    const tmpTemperature = (isQwen3 && thinkingEnabled) ? 0.6 : temperature.value;
    const tmpTopP = (isQwen3 && thinkingEnabled) ? 0.95 : topP.value;

    const result = await engine.value.chat.completions.create({
      messages: openAiMessages as any,
      temperature: tmpTemperature,
      top_p: tmpTopP,
      max_tokens: maxTokens.value,
      presence_penalty: presencePenalty.value,
      frequency_penalty: frequencyPenalty.value,
      stream: false,
    });

    const content = result?.choices?.[0]?.message?.content ?? (result as any)?.output_text ?? '';
    return String(content || '');
  }

  return {
    // state
    engine,
    isInitializing,
    initProgress,
    modelId,
    hasWebGPU,
    runtimeMode,
    runtimePreference,
    // model list & gen params
    builtInModels,
    temperature,
    topP,
    maxTokens,
    presencePenalty,
    frequencyPenalty,
    contextWindowSize,
    enableThinking,
    logLevel,
    installedModels,
    messages,
    isStreaming,
    // actions
    initEngine,
    reloadModel,
    clearChat,
    sendMessage,
    stopStreaming,
    setRuntimePreference,
    setTemperature,
    setTopP,
    setMaxTokens,
    setPresencePenalty,
    setFrequencyPenalty,
    setContextWindowSize,
    setEnableThinking,
    setLogLevel,
    removeInstalledModel,
    purgeModelCache,
    markModelInstalled,
    attachImageFile,
    attachedImageDataUrl,
    // auto-reply settings
    autoReplyAllEnabled,
    targetedReplyEnabled,
    targetedBuddyPubs,
    setAutoReplyAllEnabled,
    setTargetedReplyEnabled,
    setTargetedBuddyPubs,
    isAutoReplyEnabledForBuddy,
    // persona
    systemPersona,
    setSystemPersona,
    personaRecipe,
    setPersonaRecipe,
    addPersonaSegment,
    updatePersonaSegment,
    removePersonaSegment,
    movePersonaSegment,
    personaPresets,
    setPersonaPresets,
    addPersonaPreset,
    updatePersonaPreset,
    removePersonaPreset,
    // one-shot generation
    generateWebLLMReply,
  };
}