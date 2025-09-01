import { showToast } from '@/composables/useToast';

const API_URL = 'http://localhost:3939';

interface ChatMessage {
  role: string;
  content: string;
}

export async function fetchModels(): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/api/models`);
    const data = await response.json();
    return data.map((model: any) => model.name);
  } catch (error) {
    console.error('Error fetching models:', error);
    showToast('Failed to fetch models', 'error');
    return [];
  }
}

export async function generateReply(
  model: string,
  messages: ChatMessage[],
  mode: 'chat' | 'generate' = 'chat',
  stream: boolean = false
): Promise<string> {
  const endpoint = mode === 'chat' ? '/api/chat' : '/api/generate';
  const body = mode === 'chat'
    ? { model, messages, stream }
    : { model, prompt: messages[messages.length - 1].content, stream };

  if (stream) {
    let responseContent = '';
    const eventSource = new EventSource(`${API_URL}${endpoint}`);

    return new Promise((resolve, reject) => {
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        responseContent += mode === 'chat' ? (data.message?.content || '') : (data.response || '');
      };

      eventSource.onerror = () => {
        eventSource.close();
        reject(new Error('Streaming error'));
      };

      eventSource.onopen = async () => {
        await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      };

      // Resolve after a reasonable timeout
      setTimeout(() => {
        eventSource.close();
        resolve(responseContent);
      }, 10000);
    });
  } else {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return mode === 'chat' ? (data.message?.content || data.error) : (data.response || data.error);
  }
}