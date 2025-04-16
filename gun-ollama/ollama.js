import express from "express";
import cors from "cors";
import { Ollama } from "ollama";

// 初始化 Express 应用
const app = express();
const PORT = process.env.PORT || 3939;

// 初始化 Ollama 客户端
const ollama = new Ollama({ host: "http://localhost:11434" });

// 中间件设置
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 解析 JSON 请求体

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// 获取可用模型列表
app.get("/api/models", async (req, res) => {
  try {
    const response = await ollama.list();
    res.json(response.models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 生成文本（chat completions）
app.post("/api/chat", async (req, res) => {
  const { model, messages, stream = false, options = {} } = req.body;
  try {
    if (stream) {
      // 流式响应
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const response = await ollama.chat({
        model,
        messages,
        stream: true,
        options,
      });

      for await (const part of response) {
        res.write(`data: ${JSON.stringify(part)}\n\n`);
      }
      res.end();
    } else {
      // 非流式响应
      const response = await ollama.chat({
        model,
        messages,
        options,
      });
      res.json(response);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 生成文本（generate completions）
app.post("/api/generate", async (req, res) => {
  const { model, prompt, stream = false, options = {} } = req.body;
  try {
    if (stream) {
      // 流式响应
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const response = await ollama.generate({
        model,
        prompt,
        stream: true,
        options,
      });

      for await (const part of response) {
        res.write(`data: ${JSON.stringify(part)}\n\n`);
      }
      res.end();
    } else {
      // 非流式响应
      const response = await ollama.generate({
        model,
        prompt,
        options,
      });
      res.json(response);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建模型
app.post("/api/models/create", async (req, res) => {
  const { name, modelfile, stream = false } = req.body;
  try {
    const response = await ollama.create({
      model: name,
      modelfile,
      stream,
    });
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      for await (const part of response) {
        res.write(`data: ${JSON.stringify(part)}\n\n`);
      }
      res.end();
    } else {
      res.json(response);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除模型
app.delete("/api/models/:name", async (req, res) => {
  const { name } = req.params;
  try {
    await ollama.delete({ model: name });
    res.json({ message: `Model ${name} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 复制模型
app.post("/api/models/copy", async (req, res) => {
  const { source, destination } = req.body;
  try {
    await ollama.copy({ source, destination });
    res.json({ message: `Model copied from ${source} to ${destination}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 显示模型信息
app.get("/api/models/:name", async (req, res) => {
  const { name } = req.params;
  try {
    const response = await ollama.show({ model: name });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 拉取模型
app.post("/api/models/pull", async (req, res) => {
  const { name, stream = false } = req.body;
  try {
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const response = await ollama.pull({
        model: name,
        stream: true,
      });

      for await (const part of response) {
        res.write(`data: ${JSON.stringify(part)}\n\n`);
      }
      res.end();
    } else {
      const response = await ollama.pull({
        model: name,
      });
      res.json(response);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 推送模型
app.post("/api/models/push", async (req, res) => {
  const { name, stream = false } = req.body;
  try {
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const response = await ollama.push({
        model: name,
        stream: true,
      });

      for await (const part of response) {
        res.write(`data: ${JSON.stringify(part)}\n\n`);
      }
      res.end();
    } else {
      const response = await ollama.push({
        model: name,
      });
      res.json(response);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 生成嵌入
app.post("/api/embeddings", async (req, res) => {
  const { model, prompt } = req.body;
  try {
    const response = await ollama.embeddings({
      model,
      prompt,
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导出初始化方法
export default {
  init: () => {
    app.listen(PORT, () => {
      console.log(`Gun&Ollama Server running on http://localhost:${PORT}`);
    });
  },
};