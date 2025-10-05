import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { toastController } from '@ionic/vue';
import dayjs from 'dayjs';
import { storageServ } from '@/services/globalServices';
import { v4 as uuidv4 } from 'uuid';
import { useWebLLMChat } from '@/composables/useWebLLMChat';

// Helper function: extract clean text content from message templates
function extractCleanTextFromGroupMessage(content: string): string {
  if (!content) return '';
  
  // Remove <think> tags and their content (quoted replies)
  const thinkRegex = /<think(?:\s+from=".*?"(?:\s+alias=".*?")?)?>([\s\S]*?)<\/think>/g;
  let cleanText = content.replace(thinkRegex, '').trim();
  
  // Remove <about> tags and their content
  const aboutRegex = /<about>([\s\S]*?)<\/about>/g;
  cleanText = cleanText.replace(aboutRegex, '').trim();
  
  // Remove <apiurl> tags and their content
  const apiurlRegex = /<apiurl>([\s\S]*?)<\/apiurl>/g;
  cleanText = cleanText.replace(apiurlRegex, '').trim();
  
  // Remove other potential template tags if needed
  // Add more regex patterns here for other template types
  
  return cleanText;
}

// Helper function: check if text is an API URL
function isApiUrl(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  
  // Check for <apiurl> tag format
  const apiurlTagRegex = /<apiurl>([\s\S]*?)<\/apiurl>/;
  if (apiurlTagRegex.test(trimmed)) {
    return true;
  }
  
  // Check for common API patterns in plain URLs
  const apiPatterns = [
    /\/api\//i,
    /\/v\d+\//i,
    /\.json$/i,
    /\.xml$/i,
    /\?.*api/i,
    /graphql/i,
    /rest\//i,
    /endpoint/i
  ];
  return isUrl(trimmed) && apiPatterns.some(pattern => pattern.test(trimmed));
}

// Helper function: check if text is a URL
function isUrl(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  try {
    new URL(trimmed);
    return true;
  } catch {
    // Also check for URLs without protocol
    const urlPattern = /^(www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(\S*)?$/;
    return urlPattern.test(trimmed);
  }
}

// Helper function: check if text is Base64 media
function isBase64Media(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  
  // Check for data URL
  if (trimmed.startsWith('data:')) {
    return true;
  }
  
  // Check for plain Base64 string (basic pattern)
  const base64Pattern = /^[A-Za-z0-9+/]{100,}={0,2}$/;
  return base64Pattern.test(trimmed);
}

// Helper function: get Base64 media type
function getBase64MediaType(text: string): string {
  if (!text) return '[File]';
  const trimmed = text.trim();
  
  // Check data URL prefix
  if (trimmed.startsWith('data:')) {
    if (trimmed.includes('image/')) return '[Image]';
    if (trimmed.includes('video/')) return '[Video]';
    if (trimmed.includes('audio/')) return '[Audio]';
    if (trimmed.includes('application/pdf')) return '[PDF]';
    if (trimmed.includes('text/')) return '[Text File]';
    return '[File]';
  }
  
  // For plain Base64 strings, assume it's a file
  return '[File]';
}

// Helper function: get preview text for group messages
function getGroupMessagePreviewText(content: string, maxLength: number = 20): string {
  if (!content) return '';
  
  // Check if it might be a Base64 string FIRST
  if (isBase64Media(content)) {
    return getBase64MediaType(content);
  }
  
  // Check if it's an API URL
   if (isApiUrl(content)) {
     return 'Remote Notification Certificate';
   }
  
  // Check if it's a regular URL
  if (isUrl(content)) {
    return '[Link]';
  }
  
  const cleanText = extractCleanTextFromGroupMessage(content);
  if (!cleanText) {
    // If no clean text remains after removing templates, show a generic message
    return '[Quote Reply]';
  }
  return cleanText.length > maxLength ? cleanText.slice(0, maxLength) + '…' : cleanText;
}

interface GroupChatKeyPair {
  pub: string;
  priv: string;
  epub: string;
  epriv: string;
  alias?: string;
}

interface GroupChatGroup {
  name: string;
  pub: string;
  pair: GroupChatKeyPair;
}

export interface GroupChatMessage {
  id: number; // Switched to SQLite's auto-incrementing ID
  msg_id: string; // Gun's message ID
  sender_pub: string;
  sender_alias: string;
  content: string;
  content_type: 'text' | 'voice' | 'leave_notification';
  timestamp: number;
  status: 'sent' | 'pending' | 'failed';
  formattedTime: string;
  duration?: number; // Voice message duration in milliseconds
  isSending?: boolean; // New field for sending status
  justSent?: boolean; // New field to trigger sent animation
}

interface GroupChatMember {
  member_pub: string;
  alias: string;
  joined_at: number;
  isOnline: boolean; // This remains a real-time state, not persisted
}

interface GroupChatVote {
  voterId: string;
  vote: 'agree' | 'disagree';
  timestamp: number;
}

interface GroupChatClearSignal {
  initiator: string;
  timestamp: number;
  cleared: boolean;
}

interface GroupChatSession {
  groupPub: string;
  groupName: string;
  isRead: boolean;
  lastActivity: number;
  previewMessage?: GroupChatMessage;
}

// 🆕 环境检测函数
// 群组存储服务 - 直接使用SQLite插件（自动处理平台判断）
class GroupStorage {
  async saveGroups(groups: GroupChatGroup[]): Promise<void> {
    // 直接使用SQLite插件，插件会自动在web端使用IndexedDB
    for (const group of groups) {
      await storageServ.saveGroup({
        group_pub: group.pub,
        name: group.name,
        key_pair_json: JSON.stringify(group.pair)
      });
    }
  }
  
  async loadGroups(): Promise<GroupChatGroup[]> {
    // 直接使用SQLite插件，插件会自动在web端使用IndexedDB
    const dbGroups = await storageServ.getAllGroups();
    return dbGroups.map(dbGroup => ({
      name: dbGroup.name,
      pub: dbGroup.group_pub,
      pair: JSON.parse(dbGroup.key_pair_json)
    }));
  }
  
  async saveSessions(sessions: GroupChatSession[]): Promise<void> {
    // 群组会话数据通过群组预览表存储
    for (const session of sessions) {
      if (session.previewMessage) {
        await storageServ.updateGroupPreview(
          session.groupPub,
          session.previewMessage.content,
          session.lastActivity
        );
      }
    }
  }
  
  async loadSessions(): Promise<GroupChatSession[]> {
    // 从群组预览表加载会话数据
    const previews = await storageServ.getAllGroupPreviews();
    const groups = await this.loadGroups();
    
    return previews.map(preview => {
      const group = groups.find(g => g.pub === preview.group_pub);
      return {
        groupPub: preview.group_pub,
        groupName: group?.name || 'Unknown Group',
        isRead: true, // 默认已读状态
        lastActivity: preview.last_time,
        previewMessage: {
          id: 0,
          msg_id: '',
          sender_pub: '',
          sender_alias: '',
          content: preview.last_msg,
          content_type: 'text' as const,
          timestamp: preview.last_time,
          status: 'sent' as const,
          formattedTime: ''
        }
      };
    });
  }
}


const storageService = storageServ;

// State moved outside the composable function
const newGroupName = ref('');
const joinGroupKey = ref('');
const tempKeyPair = ref<GroupChatKeyPair | null>(null);

const groups = ref<GroupChatGroup[]>([]);
const currentGroup = ref<string | null>(null);
const currentGroupName = ref('');
const messagesByGroup = ref<{ [groupPub: string]: GroupChatMessage[] }>({});
const membersByGroup = ref<{ [groupPub: string]: GroupChatMember[] }>({});
const oldestMessageId = ref<{ [groupPub: string]: number | undefined }>({});
const votesByGroup = ref<{ [groupPub: string]: GroupChatVote[] }>({});
const groupNameListeners: { [groupPub: string]: any } = {};
const groupPreviews = ref<{ [groupPub: string]: { last_msg: string; last_time: number } }>({});
const readTimestamps = ref<{ [groupPub: string]: number }>({});

const isInitialGroupMessageSyncing = ref(false);
let messageActivityTimer: NodeJS.Timeout | null = null;
let lastMessageReceivedTime = 0;

const messageListeners: { [groupPub: string]: any } = {};
const memberListeners: { [groupPub: string]: any } = {};
const voteListeners: { [groupPub: string]: any } = {};

// 群聊自动回复设置（持久化到 localStorage）
const GROUP_AUTO_REPLY_ALL_KEY = 'group_auto_reply_all_enabled';
const GROUP_TARGETED_REPLY_ENABLED_KEY = 'group_targeted_reply_enabled';
const GROUP_TARGETED_GROUPS_KEY = 'group_targeted_groups';

const groupAutoReplyAllEnabled = ref<boolean>((localStorage.getItem(GROUP_AUTO_REPLY_ALL_KEY) ?? 'false') === 'true');
const groupTargetedReplyEnabled = ref<boolean>((localStorage.getItem(GROUP_TARGETED_REPLY_ENABLED_KEY) ?? 'false') === 'true');
const targetedGroupPubs = ref<string[]>((() => {
  try {
    const raw = localStorage.getItem(GROUP_TARGETED_GROUPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})());

function setGroupAutoReplyAllEnabled(v: boolean) {
  groupAutoReplyAllEnabled.value = !!v;
  localStorage.setItem(GROUP_AUTO_REPLY_ALL_KEY, v ? 'true' : 'false');
}
function setGroupTargetedReplyEnabled(v: boolean) {
  groupTargetedReplyEnabled.value = !!v;
  localStorage.setItem(GROUP_TARGETED_REPLY_ENABLED_KEY, v ? 'true' : 'false');
}
function setTargetedGroupPubs(pubs: string[]) {
  const uniq = Array.from(new Set(pubs || []));
  targetedGroupPubs.value = uniq;
  localStorage.setItem(GROUP_TARGETED_GROUPS_KEY, JSON.stringify(uniq));
}
function isAutoReplyEnabledForGroup(pub: string): boolean {
  if (groupTargetedReplyEnabled.value) {
    return targetedGroupPubs.value.includes(pub);
  }
  return groupAutoReplyAllEnabled.value;
}

export const useGroupChat = () => {
  const { currentUserPub, currentUserAlias, gun, triggerLightHaptic, getAliasRealtime } = getTalkFlowCore();

  const safeUserPub = computed(() => currentUserPub.value || 'No Name');
  const safeUserAlias = computed(() => currentUserAlias.value || 'No Name');



  const agreeCount = computed(() => {
    if (!currentGroup.value) return 0;
    return (votesByGroup.value[currentGroup.value] || []).filter(v => v.vote === 'agree').length;
  });

  const canClearChat = computed(() => {
      if (!currentGroup.value) return false;
      const members = membersByGroup.value[currentGroup.value] || [];
      if (members.length === 0) return false;
      return agreeCount.value === members.length;
  });

  const groupSessions = computed(() => {
    return groups.value.map(group => {
        const preview = groupPreviews.value[group.pub];
        const lastReadTime = readTimestamps.value[group.pub] || 0;
        const hasNewMessages = preview && preview.last_time > lastReadTime;
        
        return {
            groupPub: group.pub,
            groupName: group.name,
            isRead: !hasNewMessages,
            lastActivity: preview?.last_time || 0,
            previewMessage: preview ? {
                content: preview.last_msg,
                formattedTime: formatMessageTime(preview.last_time)
            } : undefined,
        };
    }).sort((a, b) => b.lastActivity - a.lastActivity);
  });

  const formatMessageTime = (timestamp: number): string => {
    return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
  };

  const markGroupAsRead = async (groupPub: string) => {
    const preview = groupPreviews.value[groupPub];
    if (preview) {
      readTimestamps.value[groupPub] = preview.last_time;
      // 使用SQLite插件存储已读时间戳（自动处理平台判断）
      try {
        await storageServ.updateGroupPreview(groupPub, preview.last_msg, preview.last_time);
      } catch (error) {
        // console.error('保存群组已读状态失败:', error);
      }
    }
  };

  const loadReadTimestamps = async () => {
    // 从SQLite插件加载已读时间戳（自动处理平台判断）
    try {
      const previews = await storageServ.getAllGroupPreviews();
      previews.forEach(preview => {
        readTimestamps.value[preview.group_pub] = preview.last_time;
      });
    } catch (error) {
      // console.error('加载群组已读状态失败:', error);
    }
  };

  const loadGroupsFromDB = async () => {
    try {
      const dbGroups = await storageService.getAllGroups();
      groups.value = dbGroups.map(g => ({
        pub: g.group_pub,
        name: g.name,
        pair: JSON.parse(g.key_pair_json),
      }));
      
      // Load all group previews
      const previews = await storageService.getAllGroupPreviews();
      groupPreviews.value = {};
      previews.forEach(p => {
        groupPreviews.value[p.group_pub] = {
          last_msg: p.last_msg,
          last_time: p.last_time
        };
      });
      
      // Load read timestamps
      await loadReadTimestamps();
      
      // 🆕 预加载所有群组的本地成员数据
      for (const group of groups.value) {
        try {
          const localMembers = await storageService.getGroupMembers(group.pub);
          const formattedMembers = localMembers.map(m => ({
            member_pub: m.member_pub,
            alias: m.alias,
            joined_at: m.joined_at,
            isOnline: false
          }));
          
          if (formattedMembers.length > 0) {
            membersByGroup.value[group.pub] = formattedMembers;
            // console.log(`[loadGroupsFromDB] 预加载群组 ${group.pub} 本地成员数据:`, formattedMembers);
          } else {
            // 如果本地没有成员数据，至少包含自己
            const selfMember = {
              member_pub: safeUserPub.value,
              alias: safeUserAlias.value,
              joined_at: Date.now(),
              isOnline: false
            };
            membersByGroup.value[group.pub] = [selfMember];
            await storageService.saveGroupMember({
              group_pub: group.pub,
              member_pub: selfMember.member_pub,
              alias: selfMember.alias,
              joined_at: selfMember.joined_at
            });
            // console.log(`[loadGroupsFromDB] 群组 ${group.pub} 无本地成员数据，添加自己`);
          }
        } catch (error) {
          // console.error(`[loadGroupsFromDB] 加载群组 ${group.pub} 本地成员数据失败:`, error);
          // 确保至少有自己
          membersByGroup.value[group.pub] = [{
            member_pub: safeUserPub.value,
            alias: safeUserAlias.value,
            joined_at: Date.now(),
            isOnline: false
          }];
        }
      }
      
      // After loading groups, set up listeners for each
      groups.value.forEach(group => {
        listenToGroupMembers(group.pub);
        listenToGroupMessages(group.pub);
        listenToGroupNameChanges(group.pub);
        listenToClearVotes(group.pub); // Add this line
      });
    } catch (error) {
      // console.error('Failed to load groups from DB:', error);
      groups.value = [];
    }
  };
  
  const createGroup = async () => {
    const groupNameTrimmed = newGroupName.value.trim();
    if (!groupNameTrimmed) throw new Error('Group name cannot be empty.');

    try {
      const pair = await Gun.SEA.pair() as GroupChatKeyPair;
      if (!pair || !pair.pub || !pair.priv) {
        throw new Error('Key pair generation failed');
      }

      const joinedAt = Date.now();
      const newGroup: GroupChatGroup = { name: groupNameTrimmed, pub: pair.pub, pair };
      const groupToSave = {
        group_pub: pair.pub,
        name: groupNameTrimmed,
        key_pair_json: JSON.stringify(pair),
        joined_at: joinedAt
      };

      await storageService.saveGroup(groupToSave);
      
      const selfMember = {
          group_pub: pair.pub,
          member_pub: safeUserPub.value,
          alias: safeUserAlias.value,
          joined_at: Date.now()
      };
      
      // 🆕 保存自己到SQLite并立即更新本地状态
      await storageService.saveGroupMember(selfMember);
      membersByGroup.value[pair.pub] = [{
        member_pub: safeUserPub.value,
        alias: safeUserAlias.value,
        joined_at: Date.now(),
        isOnline: true
      }];
      // console.log(`[createGroup] 创建群组 ${pair.pub}，添加自己为成员`);
      
      gun.get(`group_${pair.pub}_members`).get(safeUserPub.value).put({ alias: safeUserAlias.value, joinedAt: Date.now() });
      await saveGroupNameToNetwork(pair.pub, groupNameTrimmed);

      groups.value.push(newGroup);
      tempKeyPair.value = pair;
      listenToGroupMembers(pair.pub);
      listenToGroupMessages(pair.pub);
      listenToGroupNameChanges(pair.pub);
      listenToClearVotes(pair.pub);

      newGroupName.value = '';
      return newGroup;
    } catch (error) {
      // console.error('Failed to create group:', error);
      tempKeyPair.value = null;
      throw error;
    }
  };
  
  const joinGroupWithKeyPair = async (keyPairString: string) => {
      const pair: GroupChatKeyPair = JSON.parse(keyPairString);
      if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
        throw new Error('Invalid key pair format');
      }

      const groupNameData: any = await new Promise(resolve => gun.get(`group_name_${pair.pub}`).once(data => resolve(data)));
      const groupName = groupNameData?.name || `Group_${pair.pub.slice(0, 8)}`;
      
      if (groups.value.some(g => g.pub === pair.pub)) {
        // console.warn('Already in group, skipping join.');
        return; // Return undefined if already in group
      }

      isInitialGroupMessageSyncing.value = true;

      const joinedAt = Date.now();
      const groupToSave = { group_pub: pair.pub, name: groupName, key_pair_json: JSON.stringify(pair), joined_at: joinedAt };
      await storageService.saveGroup(groupToSave);
      
      const selfMember = {
          group_pub: pair.pub,
          member_pub: safeUserPub.value,
          alias: safeUserAlias.value,
          joined_at: Date.now()
      };
      
      // 🆕 保存自己到SQLite并立即更新本地状态
      await storageService.saveGroupMember(selfMember);
      membersByGroup.value[pair.pub] = [{
        member_pub: safeUserPub.value,
        alias: safeUserAlias.value,
        joined_at: Date.now(),
        isOnline: true
      }];
      // console.log(`[joinGroupWithKeyPair] 加入群组 ${pair.pub}，添加自己为成员`);
      
      gun.get(`group_${pair.pub}_members`).get(safeUserPub.value).put({ alias: safeUserAlias.value, joinedAt: Date.now() });
      
      const newGroup: GroupChatGroup = { name: groupName, pub: pair.pub, pair };
      groups.value.push(newGroup);
      listenToGroupMembers(pair.pub);
      listenToGroupMessages(pair.pub);
      listenToGroupNameChanges(pair.pub);
      listenToClearVotes(pair.pub);

      startMessageSyncMonitor(pair.pub);

      return newGroup; // Return the new group object on success
  };

  const joinGroup = async () => {
    if (!joinGroupKey.value.trim()) {
        throw new Error('Group key is required.');
    }
    await joinGroupWithKeyPair(joinGroupKey.value);
    joinGroupKey.value = '';
  };
  
  const deleteGroup = async (groupPub: string) => {
      // 1. Send leave notification
      const leaveMessage = {
          msg_id: uuidv4(),
          group_pub: groupPub,
          sender_pub: safeUserPub.value,
          sender_alias: safeUserAlias.value,
          content: `${safeUserAlias.value} has left the group.`,
          content_type: 'leave_notification',
          timestamp: Date.now(),
          status: 'pending'
      };
      const dbMessage = await storageService.insertGroupMessage(leaveMessage);
      messagesByGroup.value[groupPub]?.push({ ...dbMessage, formattedTime: formatMessageTime(dbMessage.timestamp) });
      const gunMessage = {
          ...leaveMessage,
          id: leaveMessage.msg_id
      };
      await gun.get(`group_${groupPub}`).set(gunMessage);
      
      // 2. Remove self from Gun
      gun.get(`group_${groupPub}_members`).get(safeUserPub.value).put(null);
      
      // 3. Delete local data
      await storageService.deleteGroup(groupPub);
      
      // Delete preview
      await storageService.deleteGroupPreview(groupPub);
      delete groupPreviews.value[groupPub];
      
      // 4. Update local state
      groups.value = groups.value.filter(g => g.pub !== groupPub);
      delete messagesByGroup.value[groupPub];
      delete membersByGroup.value[groupPub];
      if (groupNameListeners[groupPub]) {
        groupNameListeners[groupPub].off();
        delete groupNameListeners[groupPub];
      }
      if (currentGroup.value === groupPub) {
          currentGroup.value = null;
          currentGroupName.value = '';
      }
  };

  const listenToGroupMembers = (groupPub: string) => {
    if (memberListeners[groupPub]) memberListeners[groupPub].off();
    
    memberListeners[groupPub] = gun.get(`group_${groupPub}_members`).map().on(async (data, key) => {
        // console.log(`[Member Listener] Group: ${groupPub}, Key: ${key}, Data:`, data);
        
        let updatedMembers = [...(membersByGroup.value[groupPub] || [])]; // Create a new array for reactivity

        if (!data) {
            // Member left (null data)
            await storageService.deleteGroupMember(groupPub, key);
            const existingIndex = updatedMembers.findIndex(m => m.member_pub === key);
            if (existingIndex > -1) {
                updatedMembers.splice(existingIndex, 1);
                // console.log(`[Member Listener] 成员 ${key} 已离开群组. 当前成员:`, updatedMembers);
            }
        } else {
            // Member joined or updated
            const member = {
                group_pub: groupPub,
                member_pub: key,
                alias: data.alias,
                joined_at: data.joinedAt || Date.now()
            };
            
            // 🆕 实时同步到SQLite数据库
            try {
                await storageService.saveGroupMember(member);
                // console.log(`[Member Listener] 成员数据已保存到SQLite: ${key}`);
            } catch (error) {
                // console.error(`[Member Listener] 保存成员数据到SQLite失败: ${key}`, error);
            }
            
            const existingIndex = updatedMembers.findIndex(m => m.member_pub === key);
            const memberWithStatus = { ...member, isOnline: true }; // Assume online on update
            if (existingIndex > -1) {
                updatedMembers[existingIndex] = memberWithStatus;
                // console.log(`[Member Listener] 成员 ${key} 信息已更新. 当前成员:`, updatedMembers);
            } else {
                updatedMembers.push(memberWithStatus);
                // console.log(`[Member Listener] 成员 ${key} 已加入群组. 当前成员:`, updatedMembers);
            }
        }
        
        // 🆕 确保群组至少包含一个成员（避免空白状态）
        if (updatedMembers.length === 0) {
            // console.warn(`[Member Listener] 群组 ${groupPub} 成员列表为空，添加当前用户`);
            const selfMember = {
                member_pub: safeUserPub.value,
                alias: safeUserAlias.value,
                joined_at: Date.now(),
                isOnline: true
            };
            updatedMembers = [selfMember];
            
            // 保存到SQLite
            try {
                await storageService.saveGroupMember({
                    group_pub: groupPub,
                    member_pub: selfMember.member_pub,
                    alias: selfMember.alias,
                    joined_at: selfMember.joined_at
                });
            } catch (error) {
                // console.error(`[Member Listener] 保存自己到SQLite失败:`, error);
            }
        }
        
        membersByGroup.value[groupPub] = updatedMembers; // Assign the new array to trigger reactivity
        // console.log(`[Member Listener] 最终群成员列表[${groupPub}]:`, membersByGroup.value[groupPub]);
    });
  };

  // 发送到指定群组的辅助方法（用于自动回复）
  const sendMessageToGroup = async (groupPub: string, content: string, contentType: 'text' | 'voice' = 'text', duration?: number) => {
    if (!content.trim()) return;

    const message = {
        msg_id: uuidv4(),
        group_pub: groupPub,
        sender_pub: safeUserPub.value,
        sender_alias: safeUserAlias.value,
        content: content.trim(),
        content_type: contentType,
        timestamp: Date.now(),
        status: 'pending',
        isSending: true,
        justSent: false,
        ...(contentType === 'voice' && duration !== undefined && { duration })
    };

    const dbMessage = await storageService.insertGroupMessage(message);
    if (!messagesByGroup.value[groupPub]) messagesByGroup.value[groupPub] = [];
    messagesByGroup.value[groupPub]?.push({ ...dbMessage, formattedTime: formatMessageTime(dbMessage.timestamp), isSending: true });

    const previewText = getGroupMessagePreviewText(content.trim());
    await storageService.updateGroupPreview(groupPub, previewText, message.timestamp);
    groupPreviews.value[groupPub] = { last_msg: previewText, last_time: message.timestamp };

    const gunMessage = { ...message, id: message.msg_id };
    gun.get(`group_${groupPub}`).get(message.msg_id).put(gunMessage, async (ack: any) => {
      if (ack.err) {
        const msgIndex = messagesByGroup.value[groupPub]?.findIndex(m => m.msg_id === message.msg_id);
        if (msgIndex > -1) {
          messagesByGroup.value[groupPub][msgIndex].isSending = true; // Still sending
        }
      } else {
        await storageService.updateGroupMessageStatus(message.msg_id, 'sent');
        const msgIndex = messagesByGroup.value[groupPub]?.findIndex(m => m.msg_id === message.msg_id);
        if (msgIndex > -1) {
          messagesByGroup.value[groupPub][msgIndex].status = 'sent';
          messagesByGroup.value[groupPub][msgIndex].isSending = false;
          messagesByGroup.value[groupPub][msgIndex].justSent = true;
          setTimeout(() => {
            if (messagesByGroup.value[groupPub][msgIndex]) {
              messagesByGroup.value[groupPub][msgIndex].justSent = false;
            }
          }, 1500);
        }
      }
    });
  };

  const listenToGroupMessages = (groupPub: string) => {
    if (messageListeners[groupPub]) messageListeners[groupPub].off();

    messageListeners[groupPub] = gun.get(`group_${groupPub}`).map().on(async (data, id) => {
        if (!data || !id) return;
        
        // 新增：验证消息内容有效性
        if (!data.content || typeof data.content !== 'string' || data.content.trim() === '') {
            // console.warn(`[GroupChat] Invalid message content for ${id}:`, data.content);
            return; // 直接返回，不创建消息对象
        }
        
        // 新增：验证发送者信息
        if (!data.sender_pub || !data.sender_alias || typeof data.sender_pub !== 'string' || typeof data.sender_alias !== 'string') {
            // console.warn(`[GroupChat] Invalid sender info for ${id}:`, { sender_pub: data.sender_pub, sender_alias: data.sender_alias });
            return;
        }
        
        // 新增：验证时间戳
        if (!data.timestamp || typeof data.timestamp !== 'number' || data.timestamp <= 0) {
            // console.warn(`[GroupChat] Invalid timestamp for ${id}:`, data.timestamp);
            return;
        }
        
        // 新增：获取群组加入时间并过滤消息
        try {
            const groupInfo = await storageService.getGroup(groupPub);
            if (groupInfo && groupInfo.joined_at && data.timestamp < groupInfo.joined_at) {
                // console.log(`[GroupChat] 过滤加入时间之前的消息: ${id}, 消息时间: ${data.timestamp}, 加入时间: ${groupInfo.joined_at}`);
                return; // 过滤掉加入时间之前的消息
            }
        } catch (error) {
            // console.error(`[GroupChat] 获取群组加入时间失败: ${groupPub}`, error);
            // 如果获取失败，继续处理消息（向后兼容）
        }
        
        lastMessageReceivedTime = Date.now(); // Update last message received time
        
        // Check if message already exists locally (optimistic update or already processed)
        let existingIndex = messagesByGroup.value[groupPub]?.findIndex(m => m.msg_id === id);

        if (existingIndex > -1) {
            const existingMessage = messagesByGroup.value[groupPub][existingIndex];
            if (data.sender_pub === safeUserPub.value) {
                // This is our own message echoing back from Gun
                if (existingMessage.status !== 'sent') {
                    await storageService.updateGroupMessageStatus(existingMessage.msg_id, 'sent');
                    existingMessage.status = 'sent'; // Direct mutation is enough for reactivity here
                    existingMessage.isSending = false; // No longer sending
                    existingMessage.justSent = true; // Trigger animation for echo-back
                    setTimeout(() => {
                        if (existingMessage) { // Check if message still exists before modifying
                            existingMessage.justSent = false;
                        }
                    }, 1500);
                }
            }
            return; // Message already present, prevent duplicate addition
        }

        // If we reach here, it's a new message (either from another user, or our own that wasn't optimistically added initially)
        const message = {
            msg_id: id,
            group_pub: groupPub,
            sender_pub: data.sender_pub,
            sender_alias: data.sender_alias,
            content: data.content,
            content_type: data.content_type || 'text',
            timestamp: data.timestamp,
            status: 'sent', // Newly received messages are always 'sent'
            isSending: false, // Not sending, already received
            justSent: false, // Only for local send animation
            ...(data.content_type === 'voice' && data.duration !== undefined && { duration: data.duration })
        };

        const dbMessage = await storageService.insertGroupMessage(message);

        // Update group preview for received messages
        if (dbMessage.content_type !== 'leave_notification') {
            const previewText = getGroupMessagePreviewText(dbMessage.content);
            await storageService.updateGroupPreview(groupPub, previewText, dbMessage.timestamp);
            
            // Update local preview state
            groupPreviews.value[groupPub] = {
                last_msg: previewText,
                last_time: dbMessage.timestamp
            };
            
            // Only mark as unread if message is not from current user and we're not currently viewing this group
            // This matches the private chat logic: hasNew = data.from !== myPub && currentChatPub.value !== pubKey
            if (data.sender_pub !== safeUserPub.value && currentGroup.value !== groupPub) {
                // Don't update readTimestamps here - let it remain at the old value to show as unread
                // The group will be marked as read when user actually opens it
            } else {
                // If it's our own message or we're currently viewing this group, mark as read
                markGroupAsRead(groupPub).catch(error => {
                    // console.error('标记群组已读失败:', error);
                });
            }
        }

        // 自动回复：仅对他人文本消息触发
        try {
          const isOtherUser = data.sender_pub !== safeUserPub.value;
          const isTextMsg = (data.content_type || 'text') === 'text';
          if (isOtherUser && isTextMsg && isAutoReplyEnabledForGroup(groupPub)) {
            const { generateWebLLMReply } = useWebLLMChat();
            const aiMessages = [
              { role: 'user' as const, content: String(data.content || '') }
            ];
            const reply = (await generateWebLLMReply(aiMessages)) || '';
            if (reply.trim()) {
              await sendMessageToGroup(groupPub, reply.trim());
            }
          }
        } catch (err) {
          // console.error('[Group AutoReply] failed:', err);
        }

        // Only push to messagesByGroup if the group is currently selected
        if (groupPub === currentGroup.value) {
            if (!messagesByGroup.value[groupPub]) {
                messagesByGroup.value[groupPub] = [];
            }
            messagesByGroup.value[groupPub].push({ ...dbMessage, formattedTime: formatMessageTime(dbMessage.timestamp) });
        }

        if (dbMessage.content_type === 'leave_notification') {
            await storageService.deleteGroupMember(groupPub, dbMessage.sender_pub);
            if (membersByGroup.value[groupPub]) {
                membersByGroup.value[groupPub] = membersByGroup.value[groupPub].filter(m => m.member_pub !== dbMessage.sender_pub);
            }
        }
    });
  };

  const selectGroup = async (pub: string) => {
    currentGroup.value = pub;
    const group = groups.value.find(g => g.pub === pub);
    currentGroupName.value = group ? group.name : '';

    const initialMessages = await storageService.getGroupMessages(pub, 20);
    const formattedMessages = initialMessages.map(m => ({ ...m, formattedTime: formatMessageTime(m.timestamp) })).reverse();
    if (!messagesByGroup.value[pub]) {
      messagesByGroup.value[pub] = [];
    }
    messagesByGroup.value[pub].splice(0, messagesByGroup.value[pub].length, ...formattedMessages);

    if (initialMessages.length > 0) {
        oldestMessageId.value[pub] = initialMessages[initialMessages.length - 1]?.id;
    }

    // 🆕 优先加载本地SQLite中的群成员数据
    const localMembers = await storageService.getGroupMembers(pub);
    const formattedLocalMembers = localMembers.map(m => ({
      member_pub: m.member_pub,
      alias: m.alias,
      joined_at: m.joined_at,
      isOnline: false // 初始状态设为离线，后续通过网络同步更新
    }));
    
    // 如果本地有数据，立即显示
    if (formattedLocalMembers.length > 0) {
      membersByGroup.value[pub] = formattedLocalMembers;
      // console.log(`[selectGroup] 本地群成员数据已加载 ${pub}:`, membersByGroup.value[pub]);
    } else {
      // 如果本地没有数据，初始化为空数组
      membersByGroup.value[pub] = [];
      // console.log(`[selectGroup] 本地无群成员数据，初始化为空 ${pub}`);
    }

    // 🆕 异步从网络获取最新的群成员数据并同步到本地
    setTimeout(async () => {
      try {
        const networkMembers = await fetchCurrentGroupMembersSnapshot(pub);
        if (networkMembers.length > 0) {
          // 更新本地显示
          membersByGroup.value[pub] = networkMembers;
          // console.log(`[selectGroup] 网络群成员数据已同步 ${pub}:`, membersByGroup.value[pub]);
          
          // 同步到SQLite数据库
          for (const member of networkMembers) {
            await storageService.saveGroupMember({
              group_pub: pub,
              member_pub: member.member_pub,
              alias: member.alias,
              joined_at: member.joined_at
            });
          }
          // console.log(`[selectGroup] 群成员数据已同步到SQLite ${pub}`);
        } else if (formattedLocalMembers.length === 0) {
          // 网络和本地都没有数据，确保至少包含自己
          const selfMember = {
            member_pub: safeUserPub.value,
            alias: safeUserAlias.value,
            joined_at: Date.now(),
            isOnline: true
          };
          membersByGroup.value[pub] = [selfMember];
          await storageService.saveGroupMember({
            group_pub: pub,
            member_pub: selfMember.member_pub,
            alias: selfMember.alias,
            joined_at: selfMember.joined_at
          });
          // console.log(`[selectGroup] 添加自己作为群成员 ${pub}:`, membersByGroup.value[pub]);
        }
      } catch (error) {
        // console.error(`[selectGroup] 网络同步群成员失败 ${pub}:`, error);
        // 网络同步失败时，如果本地有数据就继续使用本地数据
        if (formattedLocalMembers.length === 0) {
          // 如果本地也没有数据，至少确保包含自己
          const selfMember = {
            member_pub: safeUserPub.value,
            alias: safeUserAlias.value,
            joined_at: Date.now(),
            isOnline: false
          };
          membersByGroup.value[pub] = [selfMember];
          await storageService.saveGroupMember({
            group_pub: pub,
            member_pub: selfMember.member_pub,
            alias: selfMember.alias,
            joined_at: selfMember.joined_at
          });
        }
      }
    }, 100); // 短暂延迟以确保UI先显示本地数据

    // Fetch and set initial votes snapshot from GunDB
    const initialVotes = await fetchCurrentGroupVotesSnapshot(pub);
    votesByGroup.value[pub] = initialVotes;
   // console.log(`[selectGroup] Initial votes loaded for ${pub}:`, votesByGroup.value[pub]);

    // Start listening to vote changes for this group
    listenToClearVotes(pub);

    // Mark group as read when selected
    markGroupAsRead(pub).catch(error => {
        // console.error('标记群组已读失败:', error);
    });
  };

  // 🆕 优化的网络群成员快照获取函数
  const fetchCurrentGroupMembersSnapshot = async (groupPub: string): Promise<GroupChatMember[]> => {
    return new Promise(resolve => {
      const tempMembers: GroupChatMember[] = [];
      let processedCount = 0;
      let totalExpected = 0;
      
      // 设置超时机制，避免无限等待
      const timeout = setTimeout(() => {
        // console.log(`[fetchCurrentGroupMembersSnapshot] 网络获取超时 ${groupPub}. 返回已获取的成员:`, tempMembers);
        resolve(tempMembers);
      }, 3000); // 3秒超时
      
      gun.get(`group_${groupPub}_members`).map().once((data, key) => {
        if (data) {
          tempMembers.push({ 
            member_pub: key, 
            alias: data.alias, 
            joined_at: data.joinedAt || Date.now(), 
            isOnline: true // 网络获取的数据认为是在线的
          });
          // console.log(`[fetchCurrentGroupMembersSnapshot] 获取到成员: ${key} (${data.alias})`);
        }
        processedCount++;
      });
      
      // 较短的延迟后解析，确保获取到初始数据
      setTimeout(() => {
        clearTimeout(timeout);
        // console.log(`[fetchCurrentGroupMembersSnapshot] 网络获取完成 ${groupPub}. 成员数量: ${tempMembers.length}`, tempMembers);
        resolve(tempMembers);
      }, 500); // 减少延迟时间
    });
  };

  // New helper to fetch current votes snapshot from GunDB
  const fetchCurrentGroupVotesSnapshot = async (groupPub: string): Promise<GroupChatVote[]> => {
    return new Promise(resolve => {
      const tempVotes: GroupChatVote[] = [];
      gun.get(`group_${groupPub}_clear_votes`).map().once((data, key) => {
        if (data && (data as any).agreed) {
          tempVotes.push({ voterId: key, vote: 'agree', timestamp: (data as any).timestamp || Date.now() });
        }
      });
      // Resolve after a short delay to ensure all initial `once` data has been processed
      setTimeout(() => {
        // console.log(`[fetchCurrentGroupVotesSnapshot] Resolved for ${groupPub}. Votes:`, tempVotes);
        resolve(tempVotes);
      }, 100); // Small delay, adjust if needed
    });
  };

  const setCurrentGroup = (pub: string | null) => {
    currentGroup.value = pub;
    if (pub) {
        const group = groups.value.find((g) => g.pub === pub);
        currentGroupName.value = group ? group.name : '';
    } else {
        currentGroupName.value = '';
    }
  };
  
  const getCurrentGroup = (): string | null => {
    return currentGroup.value;
  };
  
  const loadMoreMessages = async (groupPub: string) => {
    if (!oldestMessageId.value[groupPub]) return;
    
    const moreMessages = await storageService.getGroupMessages(groupPub, 20, oldestMessageId.value[groupPub]);

    if (moreMessages.length > 0) {
        oldestMessageId.value[groupPub] = moreMessages[moreMessages.length - 1]?.id;
        const formattedMessages = moreMessages.map(m => ({ ...m, formattedTime: formatMessageTime(m.timestamp) })).reverse();
        messagesByGroup.value[groupPub].splice(0, 0, ...formattedMessages);
    } else {
       // console.log("No more messages to load.");
        oldestMessageId.value[groupPub] = undefined; // No more older messages
    }
  };

  const sendMessage = async (content: string, contentType: 'text' | 'voice' = 'text', duration?: number) => {
    if (!content.trim() || !currentGroup.value) return;

    const groupPub = currentGroup.value;
    const message = {
        msg_id: uuidv4(),
        group_pub: groupPub,
        sender_pub: safeUserPub.value,
        sender_alias: safeUserAlias.value,
        content: content.trim(),
        content_type: contentType,
        timestamp: Date.now(),
        status: 'pending', // Optimistically set to pending
        isSending: true, // Mark as sending
        justSent: false, // Not just sent yet
        ...(contentType === 'voice' && duration !== undefined && { duration })
    };
    
    const dbMessage = await storageService.insertGroupMessage(message);
    messagesByGroup.value[groupPub]?.push({ ...dbMessage, formattedTime: formatMessageTime(dbMessage.timestamp), isSending: true });

    // Update group preview
    const previewText = getGroupMessagePreviewText(content.trim());
    await storageService.updateGroupPreview(groupPub, previewText, message.timestamp);
    
    // Update local preview state
    groupPreviews.value[groupPub] = {
        last_msg: previewText,
        last_time: message.timestamp
    };

    // Mark as read immediately after sending our own message
    markGroupAsRead(groupPub).catch(error => {
        // console.error('标记群组已读失败:', error);
    });

    const gunMessage = {
        ...message,
        id: message.msg_id // Gun uses `id` for its own reference
    };
    
    gun.get(`group_${groupPub}`).get(message.msg_id).put(gunMessage, async (ack: any) => {
        // If ack.err, we consider it still pending, as per the requirement to keep trying until successful.
        // The UI will show "pending" indefinitely until Gun acknowledges.
        if (ack.err) {
            // console.error('Gun send error:', ack.err);
            // No status change for failed, keep it pending
            // await storageService.updateGroupMessageStatus(message.msg_id, 'failed'); // REMOVED
            const msgIndex = messagesByGroup.value[groupPub]?.findIndex(m => m.msg_id === message.msg_id);
            if (msgIndex > -1) {
                // messagesByGroup.value[groupPub][msgIndex].status = 'failed'; // REMOVED
                messagesByGroup.value[groupPub][msgIndex].isSending = true; // Still sending
            }
        } else {
            // Success
            await storageService.updateGroupMessageStatus(message.msg_id, 'sent');
            const msgIndex = messagesByGroup.value[groupPub]?.findIndex(m => m.msg_id === message.msg_id);
            if (msgIndex > -1) {
                messagesByGroup.value[groupPub][msgIndex].status = 'sent';
                messagesByGroup.value[groupPub][msgIndex].isSending = false; // No longer sending
                messagesByGroup.value[groupPub][msgIndex].justSent = true; // Trigger animation
                setTimeout(() => {
                    if (messagesByGroup.value[groupPub][msgIndex]) {
                        messagesByGroup.value[groupPub][msgIndex].justSent = false;
                    }
                }, 1500); // Animation duration
            }
        }
    });
  };

  const listenToGroupNameChanges = (groupPub: string) => {
    if (groupNameListeners[groupPub]) {
      groupNameListeners[groupPub].off();
    }
    groupNameListeners[groupPub] = gun.get(`group_name_${groupPub}`).on(async (data) => {
      if (data && data.name) {
        const group = groups.value.find(g => g.pub === groupPub);
        if (group && group.name !== data.name) {
          group.name = data.name;
          if (currentGroup.value === groupPub) {
            currentGroupName.value = data.name;
          }
          await storageService.saveGroup({
            group_pub: group.pub,
            name: group.name,
            key_pair_json: JSON.stringify(group.pair)
          });
        }
      }
    });
  };

  const saveGroupNameToNetwork = async (groupPub: string, name: string) => {
    await gun.get(`group_name_${groupPub}`).put({ name });
  };

  const copyKeyPair = async (pair: GroupChatKeyPair) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(pair, null, 2));
      const toast = await toastController.create({
        message: 'Copied',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
    } catch (error) {
      // Handle error silently
    }
  };

  const voteToClear = async () => {
    if (!currentGroup.value || !safeUserPub.value) return;
    await gun.get(`group_${currentGroup.value}_clear_votes`).get(safeUserPub.value).put({ 
      agreed: true, 
      timestamp: Date.now() 
    });
  };

  const cancelVote = async () => {
      if (!currentGroup.value || !safeUserPub.value) return;
      await gun.get(`group_${currentGroup.value}_clear_votes`).get(safeUserPub.value).put(null);
  };

  // Vote-to-clear logic remains, but execution changes
  const initiateClearChat = async (groupPub: string) => {
      // Assuming canClearChat logic is still valid
      // 1. Clear local DB first
      await storageService.clearGroupMessages(groupPub);
      messagesByGroup.value[groupPub] = [];
      
      // 2. Clear network data
      gun.get(`group_${groupPub}`).put(null);
      
      // 3. Broadcast a clear signal (optional, for robustness)
      gun.get(`group_${groupPub}_clear_signal`).put({ initiator: safeUserPub.value, timestamp: Date.now() });

      const toast = await toastController.create({
        message: 'Chat history cleared',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
  };

  const listenToClearVotes = (groupPub: string) => {
    if (voteListeners[groupPub]) voteListeners[groupPub].off();
    voteListeners[groupPub] = gun.get(`group_${groupPub}_clear_votes`).map().on((data, key) => {
        // console.log(`[Vote Listener] Group: ${groupPub}, Key: ${key}, Data:`, data);
        if (!votesByGroup.value[groupPub]) {
            votesByGroup.value[groupPub] = [];
        }
        const existingIndex = votesByGroup.value[groupPub].findIndex(v => v.voterId === key);
        
        let updatedVotes = [...votesByGroup.value[groupPub]]; // Create a new array for reactivity

        if (!data) {
            // Vote removed (unvote)
            if (existingIndex > -1) {
                updatedVotes.splice(existingIndex, 1);
                // console.log(`[Vote Listener] Vote removed for ${key}. Current votes:`, updatedVotes);
            }
        } else {
            // Vote added or updated
            const vote: GroupChatVote = {
                voterId: key,
                vote: (data as any).agreed ? 'agree' : 'disagree',
                timestamp: Date.now(), // Use local time for timestamp or data.timestamp if available from Gun
            };
            if (existingIndex > -1) {
                updatedVotes[existingIndex] = vote;
                // console.log(`[Vote Listener] Vote updated for ${key}. Current votes:`, updatedVotes);
            } else {
                updatedVotes.push(vote);
                // console.log(`[Vote Listener] Vote added for ${key}. Current votes:`, updatedVotes);
            }
        }
        votesByGroup.value[groupPub] = updatedVotes; // Assign the new array to trigger reactivity
        // console.log(`[Vote Listener] Final votesByGroup[${groupPub}]:`, votesByGroup.value[groupPub]);
    });
  };

  onUnmounted(() => {
    Object.values(messageListeners).forEach((listener) => listener && listener.off());
    Object.values(memberListeners).forEach((listener) => listener && listener.off());
    Object.values(voteListeners).forEach((listener) => listener && listener.off());
    Object.values(groupNameListeners).forEach((listener) => listener && listener.off());
    if (messageActivityTimer) {
        clearInterval(messageActivityTimer);
    }
  });

  const startMessageSyncMonitor = (groupPub: string) => {
    if (messageActivityTimer) {
        clearInterval(messageActivityTimer);
    }

    lastMessageReceivedTime = Date.now(); // Initialize with current time

    messageActivityTimer = setInterval(async () => {
        const now = Date.now();
        if (now - lastMessageReceivedTime > 2000) { // No new messages for 2 seconds
            clearInterval(messageActivityTimer as NodeJS.Timeout);
            messageActivityTimer = null;
            isInitialGroupMessageSyncing.value = false;
           // console.log(`Initial sync finished for ${groupPub}. Loading last 20 messages.`);
            
            // Load the last 20 messages from SQLite for the selected group
            const initialMessages = await storageService.getGroupMessages(groupPub, 20);
            const formattedMessages = initialMessages.map(m => ({ ...m, formattedTime: formatMessageTime(m.timestamp) })).reverse();
            if (!messagesByGroup.value[groupPub]) {
              messagesByGroup.value[groupPub] = [];
            }
            // Merge new messages without duplicates
            const existingMessageIds = new Set(messagesByGroup.value[groupPub].map(msg => msg.msg_id));
            const newMessagesToDisplay = formattedMessages.filter(msg => !existingMessageIds.has(msg.msg_id));
            messagesByGroup.value[groupPub].splice(0, 0, ...newMessagesToDisplay); // Add to the beginning

            if (initialMessages.length > 0) {
                oldestMessageId.value[groupPub] = initialMessages[initialMessages.length - 1]?.id;
            }
        }
    }, 500); // Check every 500ms
};
  

function setGroupName(pair: GroupChatKeyPair, name: string) {
 //const group = groups.value.find(g => g.pub === pair.pub);
  gun.get(`group_${pair.pub}_members`).get(safeUserPub.value).set({ alias: name});
 
}

  // Return everything needed by the UI
  return {
    newGroupName,
    joinGroupKey,
    groups,
    groupPreviews,
    currentGroup,
    currentGroupName,
    messagesByGroup,
    membersByGroup,
    tempKeyPair,
    groupSessions,
    safeUserAlias,
    safeUserPub,
    loadGroups: loadGroupsFromDB,
    createGroup,
    joinGroup,
    joinGroupWithKeyPair,
    deleteGroup,
    setCurrentGroup,
    getCurrentGroup,
    selectGroup,
    loadMoreMessages,
    sendMessage,
    sendMessageToGroup,
    copyKeyPair,
    initiateClearChat, // This now takes groupPub
    agreeCount,
    canClearChat,
    voteToClear,
    cancelVote,
    getAliasRealtime,
    triggerLightHaptic,
    markGroupAsRead,
    isInitialGroupMessageSyncing,
    cleanupInvalidMessages, // 新增：清理无效消息功能
    
    // 群聊自动回复设置导出
    groupAutoReplyAllEnabled,
    groupTargetedReplyEnabled,
    targetedGroupPubs,
    setGroupAutoReplyAllEnabled,
    setGroupTargetedReplyEnabled,
    setTargetedGroupPubs,
    isAutoReplyEnabledForGroup,
    
    // ... any other functions needed, like voteToClear
  };
}; 

/* ------------------------------------------------------------------
   数据库清理功能 - 定期清理无效消息
------------------------------------------------------------------*/

/**
 * 清理无效的群聊消息
 * @param groupPub 群组公钥，如果不提供则清理所有群组
 */
const cleanupInvalidMessages = async (groupPub?: string) => {
  try {
    // console.log('🧹 开始清理无效消息...');
    
    if (groupPub) {
      // 清理指定群组的无效消息
      await storageService.cleanupInvalidGroupMessages(groupPub);
      // console.log(`✅ 已清理群组 ${groupPub} 的无效消息`);
    } else {
      // 清理所有群组的无效消息
      const allGroups = groups.value;
      for (const group of allGroups) {
        await storageService.cleanupInvalidGroupMessages(group.pub);
      }
      // console.log(`✅ 已清理所有群组的无效消息，共处理 ${allGroups.length} 个群组`);
    }
  } catch (error) {
    // console.error('❌ 清理无效消息失败:', error);
  }
};

/**
 * 启动定期清理任务
 */
const startPeriodicCleanup = () => {
  // 每30分钟执行一次清理
  const cleanupInterval = setInterval(() => {
    cleanupInvalidMessages();
  }, 30 * 60 * 1000); // 30分钟
  
  // 页面卸载时清理定时器
  onUnmounted(() => {
    clearInterval(cleanupInterval);
  });
  
  // console.log('🔄 已启动定期清理任务，每30分钟执行一次');
};

// 在组件初始化时启动定期清理
//startPeriodicCleanup();

/* ------------------------------------------------------------------
   Debugging Logs for message rendering issues
------------------------------------------------------------------*/
// No longer needed after fixing. Will be removed in final cleanup. 
// This is here to prevent accidental deletion during automated edits. 
// Remove this entire section in the final version.

