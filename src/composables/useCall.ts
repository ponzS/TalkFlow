import { reactive, nextTick } from 'vue'
import Gun from 'gun'
import 'gun/sea'
import { io } from 'socket.io-client'

interface EncodedStreamPair { readable: ReadableStream<any>; writable: WritableStream<any>; }
type RTCRtpSenderWithInsertable = RTCRtpSender & { createEncodedStreams?: () => EncodedStreamPair; transform?: TransformStream<any, any> };
type RTCRtpReceiverWithInsertable = RTCRtpReceiver & { createEncodedStreams?: () => EncodedStreamPair; transform?: TransformStream<any, any> };

export type CallState = ReturnType<typeof createCallState>

function createCallState(){
  const state = reactive({
    // basics
    lang: 'en' as 'en' | string,
    pairText: (typeof localStorage !== 'undefined' ? localStorage.getItem('room_pair') : null) || '',
    pair: null as any,
    roomPub: '' as string,
    hasPrivate: false,

    // devices
    devices: { audioIn: [] as MediaDeviceInfo[], videoIn: [] as MediaDeviceInfo[] },
    selectedAudioIn: '' as string,
    selectedVideoIn: '' as string,
    enableMic: true,
    enableCam: true,
    enableE2EE: true,

    // connection
    connected: false,
    socket: null as any,
    peers: {} as Record<string, RTCPeerConnection>,
    remoteStreams: {} as Record<string, MediaStream>,
    remotePeers: [] as string[],
    localStream: null as MediaStream | null,
    others: [] as string[],
    selfId: '' as string,
    log: [] as { t: string; m: string }[],
    iceServers: [] as RTCIceServer[],
    signalingOrigin: (typeof localStorage !== 'undefined' ? localStorage.getItem('signaling_origin') : null) || 'https://a.talkflow.team',
    iceInfo: null as any,

    e2eeKey: null as CryptoKey | null,
    e2eeSalt: null as Uint8Array | null,

    addLog(m: string){ state.log.unshift({ t: new Date().toLocaleTimeString(), m }); if(state.log.length>80) state.log.pop(); },

    async generatePair(){
      const pair = await (Gun as any).SEA.pair();
      state.pair = pair;
      state.pairText = JSON.stringify(pair, null, 2);
      state.roomPub = pair.pub;
      state.hasPrivate = !!pair.priv;
      try{ localStorage.setItem('room_pair', state.pairText); }catch(_){ }
    },

    loadPair(){
      try{
        const json = JSON.parse(state.pairText);
        state.pair = json; state.roomPub = json.pub; state.hasPrivate = !!json.priv;
        localStorage.setItem('room_pair', JSON.stringify(json));
      }catch(e){ /* ignore */ }
    },

    async enumerate(){
      const devices = await navigator.mediaDevices.enumerateDevices();
      state.devices.audioIn = devices.filter(d=>d.kind==='audioinput');
      state.devices.videoIn = devices.filter(d=>d.kind==='videoinput');
      if (!state.selectedAudioIn && state.devices.audioIn[0]) state.selectedAudioIn = state.devices.audioIn[0].deviceId;
      if (!state.selectedVideoIn && state.devices.videoIn[0]) state.selectedVideoIn = state.devices.videoIn[0].deviceId;
    },

    async getLocalStream(){
      const constraints: MediaStreamConstraints = {
        audio: state.enableMic ? { deviceId: state.selectedAudioIn ? { exact: state.selectedAudioIn } : undefined } : false,
        video: state.enableCam ? { deviceId: state.selectedVideoIn ? { exact: state.selectedVideoIn } : undefined } : false
      } as any;
      state.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      await nextTick();
      try {
        const el = document.getElementById('localVideo') as HTMLVideoElement | null;
        if (el) { el.srcObject = state.localStream; await (el as any).play?.().catch(()=>{}); }
      } catch(_){ /* ignore */ }
    },

    async deriveRoomKey(){
      const enc = new TextEncoder();
      const encodedRoom = enc.encode(state.roomPub);
      const hash = await crypto.subtle.digest('SHA-256', encodedRoom.buffer as ArrayBuffer);
      const full = new Uint8Array(hash);
      const salt = full.slice(0, 12);
      const raw = await crypto.subtle.importKey('raw', encodedRoom.buffer as ArrayBuffer, 'HKDF', false, ['deriveKey']);
      const infoBuf = enc.encode('room-e2ee');
      const hkdfParams: HkdfParams = {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: salt.buffer as ArrayBuffer,
        info: infoBuf.buffer as ArrayBuffer,
      } as HkdfParams;
      const key = await crypto.subtle.deriveKey(hkdfParams, raw, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
      return { key, salt } as { key: CryptoKey; salt: Uint8Array };
    },

    ivFrom(ts?: number, salt?: Uint8Array | null){
      const iv = new Uint8Array(12);
      const view = new DataView(iv.buffer);
      view.setBigUint64(0, BigInt(ts ?? 0));
      if (salt) iv.set((salt as Uint8Array).slice(0, 4), 8);
      return iv;
    },

    saveSignalingOrigin(){
      try{ localStorage.setItem('signaling_origin', state.signalingOrigin || ''); }catch(_){ }
      state.addLog(`Saved signaling origin: ${state.signalingOrigin || '(empty)'}`);
    },
    setSignalingOrigin(url?: string){
      state.signalingOrigin = url || '';
      state.saveSignalingOrigin();
    },

    async fetchIce(){
      try{
        const base = (state.signalingOrigin || '').replace(/\/$/, '');
        if(!base){ state.addLog('No signaling origin set'); return null }
        const res = await fetch(`${base}/ice`);
        const data = await res.json();
        if(Array.isArray(data?.iceServers)) state.iceServers = data.iceServers;
        state.iceInfo = data;
        state.addLog(`Loaded ICE from ${base}`);
        return data;
      }catch(e: any){
        state.addLog(`ICE fetch failed: ${e?.message || e}`);
        return null;
      }
    },

    async applySenderE2EE(sender: RTCRtpSender, key: CryptoKey, salt: Uint8Array){
      try{
        if (!state.enableE2EE) return;
        const s = sender as RTCRtpSenderWithInsertable as any;
        if (s?.createEncodedStreams) {
          const { readable, writable } = s.createEncodedStreams();
          const transform = new TransformStream({
            async transform(chunk: any, controller: any){
              try{ const iv = state.ivFrom(chunk.timestamp, salt); chunk.data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, chunk.data)); }catch(_){ }
              controller.enqueue(chunk);
            }
          });
          (readable as any).pipeThrough(transform).pipeTo(writable);
        } else if ('transform' in (RTCRtpSender.prototype as any)) {
          s.transform = new TransformStream({
            async transform(chunk: any, controller: any){
              try{ const iv = state.ivFrom(chunk.timestamp, salt); const buf = new Uint8Array(chunk.data); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf); chunk.data = new Uint8Array(ct); }catch(_){ }
              controller.enqueue(chunk);
            }
          });
        }
      }catch(e: any){ state.addLog('Sender E2EE not applied: '+e.message); }
    },

    async applyReceiverE2EE(receiver: RTCRtpReceiver, key: CryptoKey, salt: Uint8Array){
      try{
        if (!state.enableE2EE) return;
        const r = receiver as RTCRtpReceiverWithInsertable as any;
        if (r?.createEncodedStreams) {
          const { readable, writable } = r.createEncodedStreams();
          const transform = new TransformStream({
            async transform(chunk: any, controller: any){
              try{ const iv = state.ivFrom(chunk.timestamp, salt); const data = new Uint8Array(chunk.data); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data); chunk.data = new Uint8Array(pt); controller.enqueue(chunk); }catch(_){ controller.enqueue(chunk); }
            }
          });
          (readable as any).pipeThrough(transform).pipeTo(writable);
        } else if ('transform' in (RTCRtpReceiver.prototype as any)) {
          r.transform = new TransformStream({
            async transform(chunk: any, controller: any){
              try{ const iv = state.ivFrom(chunk.timestamp, salt); const data = new Uint8Array(chunk.data); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data); chunk.data = new Uint8Array(pt); }catch(_){ }
              controller.enqueue(chunk);
            }
          });
        }
      }catch(e: any){ state.addLog('Receiver E2EE not applied: '+e.message); }
    },

    newPC(id: string){
      const cfg: RTCConfiguration = { iceServers: state.iceServers && state.iceServers.length ? state.iceServers : [ { urls: 'stun:stun.l.google.com:19302' } ] };
      const pc = new RTCPeerConnection(cfg);
      state.peers[id] = pc;
      pc.onicecandidate = ev => { if (ev.candidate) { state.addLog(`ICE => candidate to ${id}`); state.socket?.emit('signal', { type:'candidate', data: ev.candidate, to: id }); } };
      pc.oniceconnectionstatechange = ()=> state.addLog(`Peer ${id} ice ${pc.iceConnectionState}`);
      pc.onconnectionstatechange = ()=> state.addLog(`Peer ${id} ${pc.connectionState}`);
      pc.ontrack = async (ev)=>{
        try {
          const receiver = (ev as any).receiver || (ev as any).transceiver?.receiver;
          if (receiver && state.e2eeKey && state.e2eeSalt) { await state.applyReceiverE2EE(receiver, state.e2eeKey, state.e2eeSalt); }
        } catch (e: any) { state.addLog('Receiver E2EE (ontrack) error: '+e.message); }
        const stream = ev.streams?.[0] || new MediaStream([ev.track]);
        state.remoteStreams[id] = stream;
        if (!state.remotePeers.includes(id)) state.remotePeers.push(id);
        await nextTick();
        const elId = `remote-${id}`;
        const el = document.getElementById(elId) as HTMLVideoElement | null;
        if (el) { el.srcObject = stream; (el as any).play?.().catch(()=>{}); }
      };
      return pc;
    },

    async start(){
      try{
        state.loadPair();
        if (!state.hasPrivate) { alert('A full key pair is required to join the room.'); return; }

        await state.enumerate();
        // 仅在加入房间时获取本地媒体流
        await state.getLocalStream();

        // Load ICE configuration
        let origin = (state.signalingOrigin || '').replace(/\/$/, '');
        if (origin) {
          await state.fetchIce();
        } else {
          try {
            const res = await fetch('/ice');
            const data = await res.json();
            if (Array.isArray(data.iceServers)) state.iceServers = data.iceServers;
            origin = (data?.signaling?.localOrigin || data?.signaling?.currentOrigin || window.location.origin);
            state.addLog('ICE loaded: '+JSON.stringify(state.iceServers));
          } catch(e: any) {
            state.addLog('ICE load failed, using fallback: '+(e?.message||e));
            origin = window.location.origin;
          }
          state.signalingOrigin = origin;
        }

        // Derive E2EE materials
        const { key, salt } = await state.deriveRoomKey();
        state.e2eeKey = key; state.e2eeSalt = salt;

        // Connect signaling
        state.socket = io(origin, { path: '/socket.io' });
        state.socket.on('connect', ()=> state.addLog('Socket connected'));
        state.socket.on('connect_error', (err: any)=>{ state.addLog('Socket connect_error: '+(err?.message||err)); });
        state.socket.on('error', (err: any)=>{ state.addLog('Socket error: '+(err?.message||err)); });
        state.socket.on('disconnect', (reason: any)=> state.addLog('Socket disconnected: '+reason));
        state.socket.on('auth_error', (e: any)=>{ state.addLog('Auth error: '+(e?.message||'')); alert('Authentication failed'); state.connected=false; });

        state.socket.on('challenge', async ({ id, text }: any)=>{
          const signature = await (Gun as any).SEA.sign(text, state.pair);
          state.socket!.emit('auth', { roomPub: state.roomPub, signature, challengeId: id });
        });

        state.socket.on('auth_ok', async ({ roomPub, peers, self, others }: any)=>{
          state.addLog(`Authenticated as ${self}, room ${roomPub} peers ${peers}`);
          state.connected = true; state.selfId = self; state.others = others || [];
          for(const pid of state.others){ await state.call(pid, state.e2eeKey!, state.e2eeSalt!); }
        });

        state.socket.on('peer-joined', async ({ id }: any)=>{
          if (id === state.selfId) return;
          state.addLog(`Peer joined: ${id}`);
          if (!state.others.includes(id)) state.others.push(id);
        });

        state.socket.on('peer-left', ({ id }: any)=>{
          state.addLog(`Peer left: ${id}`);
          try{ state.peers[id]?.close?.(); }catch(_){ }
          delete state.peers[id];
          delete state.remoteStreams[id];
          state.remotePeers = state.remotePeers.filter(p=>p!==id);
          state.others = state.others.filter(p=>p!==id);
        });

        state.socket.on('signal', async ({ from, type, data }: any)=>{
          let pc = state.peers[from];
          if (!pc) pc = state.newPC(from);

          if (type === 'offer'){
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            state.localStream!.getTracks().forEach(t=> pc.addTrack(t, state.localStream!));
            if (state.enableE2EE) {
              for(const sender of pc.getSenders()){
                if (sender.track) await state.applySenderE2EE(sender, state.e2eeKey!, state.e2eeSalt!);
              }
            }
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            state.socket!.emit('signal', { type:'answer', data: pc.localDescription, to: from });
          } else if (type === 'answer'){
            await pc.setRemoteDescription(new RTCSessionDescription(data));
          } else if (type === 'candidate'){
            try { await pc.addIceCandidate(data); } catch(e: any) { state.addLog('addIceCandidate error: '+e.message); }
          }
        });

        // request auth to join room
        state.socket.emit('get_challenge');
        state.addLog('Requested auth challenge');

      }catch(e: any){
        console.error(e); state.addLog('Start error: '+e.message);
      }
    },

    async call(id: string, key: CryptoKey, salt: Uint8Array){
      let pc = state.peers[id];
      if (!pc) pc = state.newPC(id);
      state.localStream!.getTracks().forEach(t=> pc.addTrack(t, state.localStream!));
      if (state.enableE2EE) {
        for(const sender of pc.getSenders()){
          if (sender.track) await state.applySenderE2EE(sender, key, salt);
        }
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      state.socket!.emit('signal', { type:'offer', data: pc.localDescription, to: id });
    },

    stop(){
      try{
        Object.values(state.peers).forEach(pc=>{ try{ pc.close(); }catch(_){ } });
        state.peers = {};
        state.remoteStreams = {} as Record<string, MediaStream>;
        state.remotePeers = [];
        if (state.localStream){ state.localStream.getTracks().forEach(t=> t.stop()); }
        state.localStream = null;
        try { const lv = document.getElementById('localVideo') as HTMLVideoElement | null; if (lv) lv.srcObject = null; } catch(_){ }
        if (state.socket){ try{ state.socket.disconnect(); }catch(_){ } }
        state.connected = false; state.selfId = ''; state.others = [];
        state.addLog('Stopped');
      }catch(e: any){ state.addLog('Stop error: '+e.message); }
    }
  })

  return state
}

export function useCall(): CallState{
  return createCallState()
}