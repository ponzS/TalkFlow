import { reactive } from 'vue'

export type CallOverlayState = ReturnType<typeof createCallOverlayState>

function createCallOverlayState(){
  const state = reactive({
    enabled: false,
    visible: false,
    minimized: false,
    miniPos: { x: 12, y: 100 },

    load(){
      try{ state.enabled = localStorage.getItem('call_overlay_enabled') === '1' }catch(_){ state.enabled = false }
    },
    save(){
      try{ localStorage.setItem('call_overlay_enabled', state.enabled ? '1' : '0') }catch(_){ }
    },
    setEnabled(v: boolean){
      state.enabled = !!v;
      state.save();
      if (!state.enabled){
        state.visible = false; state.minimized = false;
      } else {
        // 启用时直接显示全屏窗口，并退出最小化
        state.visible = true; state.minimized = false;
      }
    },
    show(){ state.visible = true; state.minimized = false },
    hide(){ state.visible = false; state.minimized = false },
    minimize(){ state.minimized = true; state.visible = true },
    maximize(){ state.minimized = false; state.visible = true },
    setMiniPos(x: number, y: number){ state.miniPos.x = x; state.miniPos.y = y }
  })
  state.load()
  return state
}

let _singleton: CallOverlayState | null = null
export function useCallOverlay(): CallOverlayState{
  if (!_singleton) _singleton = createCallOverlayState()
  return _singleton!
}