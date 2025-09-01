<template>
  <ion-modal :is-open="isOpen" @didDismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t('Message Templates') || '消息模板' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">
            {{ $t('Close') || '关闭' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <!-- 搜索框 -->
      <div class="search-container">
        <ion-searchbar
          v-model="searchQuery"
          :placeholder="$t('Search templates...') || '搜索模板...'"
          :debounce="300"
        ></ion-searchbar>
      </div>

      <!-- 模板分类 scrollable-->
      <div class="template-categories">
        <ion-segment v-model="selectedCategory" mode="ios">
          <ion-segment-button 
            v-for="category in categories" 
            :key="category.id"
            :value="category.id"
          >
            <ion-label>{{ category.name }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      <!-- 模板列表 -->
      <div class="template-list">
        <div 
          v-for="template in filteredTemplates" 
          :key="template.id"
          class="template-card"
          @click="selectTemplate(template)"
        >
          <div class="template-header">
            <div class="template-info">
              <h3>{{ template.title }}</h3>
              <p>{{ template.description }}</p>
            </div>
            <div class="template-actions">
              <ion-chip 
                :color="getCategoryColor(template.category)"
                class="category-chip"
              >
                {{ getCategoryName(template.category) }}
              </ion-chip>
            </div>
          </div>
          
          <div class="template-preview">
            <pre>{{ template.content.slice(0, 200) }}{{ template.content.length > 200 ? '...' : '' }}</pre>
          </div>
          
          <div class="template-footer">
            <ion-chip 
              v-for="tag in template.tags" 
              :key="tag"
              size="small"
              class="tag-chip"
            >
              {{ tag }}
            </ion-chip>
          </div>
        </div>
      </div>

      <!-- 自定义模板 -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="primary" @click="showCustomTemplate = true">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- 自定义模板模态框 -->
    <ion-modal :is-open="showCustomTemplate" @didDismiss="showCustomTemplate = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ $t('Custom Template') || '自定义模板' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showCustomTemplate = false">
              {{ $t('Cancel') || '取消' }}
            </ion-button>
            <ion-button @click="saveCustomTemplate" :disabled="!customTemplate.title || !customTemplate.content">
              {{ $t('Save') || '保存' }}
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      
      <ion-content class="ion-padding">
        <ion-item>
          <ion-label position="stacked">{{ $t('Title') || '标题' }}</ion-label>
          <ion-input v-model="customTemplate.title" :placeholder="$t('Enter template title') || '输入模板标题'"></ion-input>
        </ion-item>
        
        <ion-item>
          <ion-label position="stacked">{{ $t('Description') || '描述' }}</ion-label>
          <ion-input v-model="customTemplate.description" :placeholder="$t('Enter description') || '输入描述'"></ion-input>
        </ion-item>
        
        <ion-item>
          <ion-label position="stacked">{{ $t('Category') || '分类' }}</ion-label>
          <ion-select v-model="customTemplate.category">
            <ion-select-option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        
        <ion-item>
          <ion-label position="stacked">{{ $t('Tags') || '标签' }} ({{ $t('comma separated') || '逗号分隔' }})</ion-label>
          <ion-input v-model="customTemplate.tagsString" :placeholder="$t('coding, help, example') || '编程, 帮助, 示例'"></ion-input>
        </ion-item>
        
        <ion-item>
          <ion-label position="stacked">{{ $t('Content') || '内容' }}</ion-label>
          <ion-textarea 
            v-model="customTemplate.content" 
            :rows="8"
            :placeholder="$t('Enter template content...') || '输入模板内容...'"
          ></ion-textarea>
        </ion-item>
      </ion-content>
    </ion-modal>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonChip, IonFab, IonFabButton,
  IonIcon, IonItem, IonInput, IonSelect, IonSelectOption, IonTextarea,
} from '@ionic/vue';
import { addOutline } from 'ionicons/icons';
import { showToast } from '@/composables/useToast';

interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  isCustom?: boolean;
}

interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  selectTemplate: [template: Template];
}>();

// 状态
const searchQuery = ref('');
const selectedCategory = ref('all');
const showCustomTemplate = ref(false);

// 分类定义
const categories = ref([
  { id: 'all', name: 'All' },
  { id: 'coding', name: 'Coding' },
  { id: 'writing', name: 'Writing' },
  { id: 'analysis', name: 'Analysis' },
  { id: 'creative', name: 'Creative' },
  { id: 'business', name: 'Business' },
  { id: 'learning', name: 'Learning' },
  { id: 'custom', name: 'Custom' },
]);

// 预设模板
const defaultTemplates: Template[] = [
  {
    id: 'code-review',
    title: 'Code Review',
    description: 'Request code review and suggestions',
    category: 'coding',
    tags: ['review', 'optimization', 'best-practices'],
    content: `Please review the following code and provide suggestions for improvement:

\`\`\`
[PASTE YOUR CODE HERE]
\`\`\`

Focus on:
- Code quality and readability
- Performance optimizations
- Security concerns
- Best practices
- Potential bugs`
  },
  {
    id: 'debug-help',
    title: 'Debug Help',
    description: 'Get help debugging code issues',
    category: 'coding',
    tags: ['debug', 'troubleshooting', 'error'],
    content: `I'm encountering an issue with my code. Here are the details:

**Problem Description:**
[DESCRIBE THE ISSUE]

**Code:**
\`\`\`
[PASTE YOUR CODE HERE]
\`\`\`

**Error Message:**
\`\`\`
[PASTE ERROR MESSAGE HERE]
\`\`\`

**Expected Behavior:**
[WHAT SHOULD HAPPEN]

**Actual Behavior:**
[WHAT ACTUALLY HAPPENS]

Please help me identify and fix the issue.`
  },
  {
    id: 'explain-code',
    title: 'Explain Code',
    description: 'Request detailed code explanation',
    category: 'coding',
    tags: ['explanation', 'learning', 'documentation'],
    content: `Please explain the following code in detail:

\`\`\`
[PASTE YOUR CODE HERE]
\`\`\`

<think>
Let me analyze this code step by step:
1. First, I'll identify the main purpose
2. Then break down each component
3. Explain the logic flow
4. Highlight important concepts
</think>

Please include:
- What the code does
- How it works
- Key concepts used
- Any potential improvements`
  },
  {
    id: 'writing-improve',
    title: 'Improve Writing',
    description: 'Get suggestions to improve your writing',
    category: 'writing',
    tags: ['improvement', 'editing', 'style'],
    content: `Please review and improve the following text:

"[PASTE YOUR TEXT HERE]"

Focus on:
- Grammar and spelling
- Clarity and readability
- Style and tone
- Structure and flow
- Conciseness`
  },
  {
    id: 'data-analysis',
    title: 'Data Analysis',
    description: 'Request data analysis and insights',
    category: 'analysis',
    tags: ['data', 'statistics', 'insights'],
    content: `Please analyze the following data and provide insights:

**Data:**
[PASTE YOUR DATA HERE]

**Analysis Goals:**
- [SPECIFY WHAT YOU WANT TO LEARN]
- [ANY SPECIFIC METRICS]
- [TRENDS TO IDENTIFY]

<think>
I need to examine this data carefully:
1. Understand the data structure
2. Identify patterns and trends
3. Calculate relevant statistics
4. Draw meaningful conclusions
</think>

Please provide:
- Key findings
- Statistical summary
- Trends and patterns
- Recommendations`
  },
  {
    id: 'creative-brainstorm',
    title: 'Creative Brainstorming',
    description: 'Generate creative ideas and solutions',
    category: 'creative',
    tags: ['brainstorming', 'ideas', 'creativity'],
    content: `I need creative ideas for:

**Project/Topic:** [DESCRIBE YOUR PROJECT]

**Constraints:**
- [LIST ANY LIMITATIONS]
- [BUDGET/TIME CONSTRAINTS]
- [TARGET AUDIENCE]

**Goals:**
- [WHAT YOU WANT TO ACHIEVE]
- [SUCCESS CRITERIA]

Please provide:
- Multiple creative approaches
- Innovative solutions
- Different perspectives
- Actionable suggestions`
  },
  {
    id: 'business-plan',
    title: 'Business Analysis',
    description: 'Business strategy and planning assistance',
    category: 'business',
    tags: ['strategy', 'planning', 'analysis'],
    content: `Please help me analyze this business scenario:

**Business/Product:** [DESCRIBE YOUR BUSINESS]

**Current Situation:**
- [CURRENT STATE]
- [CHALLENGES FACED]
- [OPPORTUNITIES]

**Goals:**
- [SHORT-TERM GOALS]
- [LONG-TERM OBJECTIVES]

Please provide:
- SWOT analysis
- Strategic recommendations
- Market insights
- Action plan`
  },
  {
    id: 'learning-explain',
    title: 'Learning Helper',
    description: 'Explain complex concepts simply',
    category: 'learning',
    tags: ['education', 'explanation', 'concepts'],
    content: `Please explain the concept of "[TOPIC]" in simple terms.

**My Background:**
- [YOUR CURRENT KNOWLEDGE LEVEL]
- [SPECIFIC AREAS OF CONFUSION]

<think>
I need to break this down appropriately:
1. Assess the complexity level needed
2. Use appropriate analogies
3. Build from basic to advanced concepts
4. Provide practical examples
</think>

Please include:
- Simple, clear explanation
- Real-world examples
- Step-by-step breakdown
- Related concepts
- Practice suggestions`
  },
];

// 自定义模板
const customTemplate = ref({
  title: '',
  description: '',
  category: 'custom',
  content: '',
  tagsString: '',
});

// 所有模板
const allTemplates = ref<Template[]>([]);

// 过滤后的模板
const filteredTemplates = computed(() => {
  let filtered = allTemplates.value;

  // 按分类过滤
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(t => t.category === selectedCategory.value);
  }

  // 按搜索查询过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  return filtered;
});

// 获取分类颜色
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    coding: 'primary',
    writing: 'secondary',
    analysis: 'tertiary',
    creative: 'success',
    business: 'warning',
    learning: 'danger',
    custom: 'medium',
  };
  return colors[category] || 'medium';
};

// 获取分类名称
const getCategoryName = (category: string) => {
  const categoryObj = categories.value.find(c => c.id === category);
  return categoryObj?.name || category;
};

// 选择模板
const selectTemplate = (template: Template) => {
  emit('selectTemplate', template);
  emit('close');
};

// 保存自定义模板
const saveCustomTemplate = () => {
  // 验证输入
  if (!customTemplate.value.title.trim()) {
    showToast('Please enter a template title', 'warning');
    return;
  }
  
  if (!customTemplate.value.content.trim()) {
    showToast('Please enter template content', 'warning');
    return;
  }
  
  // 确保所有字段都是正确的数据类型
  const template: Template = {
    id: `custom-${Date.now()}`,
    title: String(customTemplate.value.title).trim(),
    description: String(customTemplate.value.description).trim(),
    category: String(customTemplate.value.category),
    content: String(customTemplate.value.content).trim(),
    tags: String(customTemplate.value.tagsString || '')
      .split(',')
      .map(tag => String(tag).trim())
      .filter(tag => tag.length > 0),
    isCustom: true,
  };

  // 验证模板内容不包含对象
  if (typeof template.content !== 'string') {
    showToast('Invalid template content format', 'error');
    return;
  }

  allTemplates.value.push(template);
  saveCustomTemplates();
  
  showToast('Custom template saved!', 'success');
  console.log('✅ Saved custom template:', template);
  
  // 重置表单
  customTemplate.value = {
    title: '',
    description: '',
    category: 'custom',
    content: '',
    tagsString: '',
  };
  
  showCustomTemplate.value = false;
};

// 保存自定义模板到本地存储
const saveCustomTemplates = () => {
  const customTemplates = allTemplates.value.filter(t => t.isCustom);
  localStorage.setItem('aiChatCustomTemplates', JSON.stringify(customTemplates));
};

// 验证模板数据结构
const validateTemplate = (template: any): Template | null => {
  try {
    // 检查必需字段
    if (!template || typeof template !== 'object') {
      return null;
    }
    
    // 确保所有字段都是正确的类型
    const validatedTemplate: Template = {
      id: String(template.id || `fallback-${Date.now()}`),
      title: String(template.title || 'Untitled'),
      description: String(template.description || ''),
      category: String(template.category || 'custom'),
      content: '', // 先设为空，下面特殊处理
      tags: Array.isArray(template.tags) 
        ? template.tags.map(tag => String(tag)).filter(tag => tag.length > 0)
        : [],
      isCustom: Boolean(template.isCustom),
    };
    
    // 特殊处理 content 字段
    if (template.content !== null && template.content !== undefined) {
      if (typeof template.content === 'object') {
        // 如果内容是对象，尝试JSON序列化
        try {
          validatedTemplate.content = JSON.stringify(template.content, null, 2);
          console.warn('⚠️ Template content was an object, converted:', template.id);
        } catch (e) {
          console.error('❌ Failed to serialize template content:', template.id);
          return null;
        }
      } else {
        validatedTemplate.content = String(template.content);
      }
    }
    
    // 验证必需内容
    if (!validatedTemplate.content.trim()) {
      console.warn('⚠️ Skipping template with empty content:', template.id);
      return null;
    }
    
    return validatedTemplate;
  } catch (error) {
    console.error('❌ Template validation failed:', error);
    return null;
  }
};

// 加载自定义模板
const loadCustomTemplates = () => {
  try {
    const saved = localStorage.getItem('aiChatCustomTemplates');
    if (saved) {
      const rawTemplates = JSON.parse(saved);
      const validatedTemplates: Template[] = [];
      
      if (Array.isArray(rawTemplates)) {
        for (const rawTemplate of rawTemplates) {
          const validated = validateTemplate(rawTemplate);
          if (validated) {
            validatedTemplates.push(validated);
          }
        }
      }
      
      allTemplates.value = [...defaultTemplates, ...validatedTemplates];
      console.log(`✅ Loaded ${validatedTemplates.length} valid custom templates`);
      
      // 如果有无效模板被过滤，重新保存干净的数据
      if (validatedTemplates.length !== rawTemplates.length) {
        console.log('🧹 Cleaning up invalid templates in storage');
        const customTemplates = allTemplates.value.filter(t => t.isCustom);
        localStorage.setItem('aiChatCustomTemplates', JSON.stringify(customTemplates));
      }
    } else {
      allTemplates.value = [...defaultTemplates];
    }
  } catch (error) {
    console.error('❌ Error loading custom templates:', error);
    allTemplates.value = [...defaultTemplates];
    
    // 清理损坏的localStorage数据
    try {
      localStorage.removeItem('aiChatCustomTemplates');
      console.log('🧹 Cleaned up corrupted template storage');
    } catch (e) {
      console.error('Failed to clean localStorage:', e);
    }
  }
};

// 组件挂载时加载模板
onMounted(() => {
  loadCustomTemplates();
});
</script>

<style scoped>
.search-container {
  padding: 16px;
  background: var(--ion-background-color);
  border-bottom: 1px solid var(--ion-color-step-100);
}

.template-categories {
  padding: 8px 16px;
  background: var(--ion-background-color);
  border-bottom: 1px solid var(--ion-color-step-100);
}

.template-list {
  padding: 16px;
}

.template-card {
  background: var(--ion-background-color);
  border: 1px solid var(--ion-color-step-100);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-color: var(--ion-color-primary);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.template-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--ion-color-primary);
}

.template-info p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 14px;
  line-height: 1.4;
}

.template-actions {
  flex-shrink: 0;
  margin-left: 12px;
}

.category-chip {
  font-size: 12px;
  font-weight: 500;
}

.template-preview {
  background: var(--ion-color-step-50);
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
}

.template-preview pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
  color: var(--ion-color-medium);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.template-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tag-chip {
  font-size: 11px;
  --background: var(--ion-color-step-100);
  --color: var(--ion-color-medium);
}

/* 自定义模板表单样式 */
ion-item {
  margin-bottom: 16px;
}

ion-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .template-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .template-actions {
    margin-left: 0;
    margin-top: 8px;
  }
  
  .template-preview pre {
    font-size: 12px;
  }
}
</style> 