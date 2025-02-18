// gun-ionic-adapter.ts
import { sharedStorage } from './sharedStorage';
import { Flint, NodeAdapter } from 'gun-flint';

async function ensureStorage() {
  if (!sharedStorage) {
    // sharedStorage 在模块加载时已经初始化，但这里做个保险
    await sharedStorage.create();
  }
  return sharedStorage;
}

const gunIonicAdapter = new NodeAdapter({
  opt: function (context: any, options: any) {
    console.log("适配器初始化：opt 被调用。上下文：", context, "选项：", options);
    // 确保存储已经初始化后挂载到适配器上
    ensureStorage().then((storageInstance) => {
      this.storage = storageInstance;
    });
    return options;
  },
  get: async function (key: string, field: any, done: (err: any, data?: any) => void) {
    console.log("适配器 get 被调用。key =", key, "field =", field);
    if (!key) {
      console.warn("get 方法调用时 key 为空，忽略该调用");
      return done(null, null);
    }
    if (typeof key !== 'string') {
      key = String(key);
    }
    try {
      const storageInstance = await ensureStorage();
      // 如果是分页查询，node 对象中应该包含 __command: 'paginate'
      // 这里假设 field 或 key中可以传递这样的信息（实际你可能需要约定如何传递分页参数）
      // 假设 field 就是传递的分页参数对象
      if (field && field.__command === 'paginate') {
        // 分页参数
        const chatId = field.chatId; // 聊天记录的节点前缀（例如可以用 generateChatId() 得到的 id）
        const offset = field.offset || 0;
        const limit = field.limit || 10; // 默认每页 10 条记录
        // 获取所有存储的键
        const allKeys = await storageInstance.keys();
        // 过滤出属于当前聊天的消息记录（假设存储时每条消息的 key 都以 chatId 为前缀）
        const chatKeys = allKeys.filter((k: string) => k.startsWith(chatId));
        // 根据你的需求对 chatKeys 进行排序（如果你在消息数据中有 timestamp 字段，可以根据该字段排序，
        // 或者你的 key 自身就是按照时间递增的字符串）
        chatKeys.sort();
        // 截取分页数据
        const selected = chatKeys.slice(offset, offset + limit);
        // 逐个取出这些记录
        const result: Record<string, any> = {};
        for (const k of selected) {
          result[k] = await storageInstance.get(k);
        }
        console.log("分页查询返回数据：", result);
        return done(null, result);
      } else {
        // 正常读取
        const data = await storageInstance.get(key);
        console.log("成功读取 key =", key, "数据：", data);
        done(null, data);
      }
    } catch (error) {
      console.error("读取 key =", key, "数据时出错：", error);
      done(error);
    }
  },
  put: async function (node: any, done: (err: any, result?: any) => void) {
    console.log("适配器 put 被调用。节点数据：", node);
    try {
      const storageInstance = await ensureStorage();
      // 如果 node 中包含特殊命令 __command，则走特殊处理逻辑
      if (node && node.__command) {
        switch (node.__command) {
          case 'remove':
            if (node.key) {
              await storageInstance.remove(node.key);
              console.log(`删除成功，key = ${node.key}`);
              return done(null);
            } else {
              throw new Error("remove 命令必须提供 key");
            }
          case 'clear':
            await storageInstance.clear();
            console.log("清除所有数据成功");
            return done(null);
          case 'keys': {
            const keys = await storageInstance.keys();
            console.log("获取 keys 成功", keys);
            return done(null, keys);
          }
          case 'length': {
            const len = await storageInstance.length();
            console.log("获取长度成功", len);
            return done(null, len);
          }
          case 'forEach': {
            let items: any[] = [];
            await storageInstance.forEach((value: any, key: any, index: any) => {
              items.push({ key, value, index });
            });
            console.log("forEach 遍历结果", items);
            return done(null, items);
          }
          case 'set': {
            if (node.key !== undefined && node.value !== undefined) {
              await storageInstance.set(node.key, node.value);
              console.log("特殊 set 成功", node.key);
              return done(null);
            } else {
              throw new Error("set 命令必须提供 key 和 value");
            }
          }
          case 'paginate': {
            // 示例分页命令：node 中需要包含 key（作为前缀过滤）、offset、limit 参数
            if (node.key === undefined) {
              throw new Error("paginate 命令必须提供 key");
            }
            const allKeys = await storageInstance.keys();
            // 例如过滤所有以 node.key 为前缀的键（你可以根据实际情况调整过滤逻辑）
            const filteredKeys = allKeys.filter((k: any) => k.startsWith(node.key));
            filteredKeys.sort(); // 按字典序排序
            const offset = node.offset || 0;
            const limit = node.limit || 10;
            const pageKeys = filteredKeys.slice(offset, offset + limit);
            let pageData = [];
            for (const k of pageKeys) {
              const data = await storageInstance.get(k);
              pageData.push({ key: k, data });
            }
            console.log("分页数据", pageData);
            return done(null, pageData);
          }
          default:
            throw new Error("未知的命令类型: " + node.__command);
        }
      }
      // 如果没有特殊命令，则进行正常的存储操作，使用节点内部 _.id 作为 key
      const key = node._ && node._.id;
      if (!key) {
        throw new Error("节点必须具有 _.id 属性才能存储。");
      }
      await storageInstance.set(key, node);
      console.log("成功存储节点，key =", key);
      done(null);
    } catch (error) {
      console.error("存储节点失败，节点：", node, "错误：", error);
      done(error);
    }
  },
});

Flint.register(gunIonicAdapter);
console.log("Gun Ionic Adapter 注册完成！");
export default gunIonicAdapter;