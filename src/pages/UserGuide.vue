<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :text="$t('userGuideBack')" @click="router.go(-1)" color="primary"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ $t('userGuideTitle') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="shareGuide" fill="clear">
            <ion-icon :icon="shareOutline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="guide-container">
        <!-- Header -->
        <div class="guide-header">
          <ion-icon :icon="sparklesOutline" class="guide-icon"></ion-icon>
          <h1>{{ $t('userGuideWelcome') }}</h1>
          <p class="guide-description">{{ $t('userGuideDescription') }}</p>
        </div>

        <!-- Features Overview -->
        <div class="section">
          <h2>{{ $t('userGuideFeaturesTitle') }}</h2>
          <div class="feature-grid">
            <div class="feature-card">
              <ion-icon :icon="chatbubblesOutline" class="feature-icon"></ion-icon>
              <h3>{{ $t('userGuideChatTitle') }}</h3>
              <p>{{ $t('userGuideChatDescription') }}</p>
            </div>
            <div class="feature-card">
              <ion-icon :icon="imageOutline" class="feature-icon"></ion-icon>
              <h3>{{ $t('userGuideImageGenTitle') }}</h3>
              <p>{{ $t('userGuideImageGenDescription') }}</p>
            </div>
            <div class="feature-card">
              <ion-icon :icon="eyeOutline" class="feature-icon"></ion-icon>
              <h3>{{ $t('userGuideImageRecTitle') }}</h3>
              <p>{{ $t('userGuideImageRecDescription') }}</p>
            </div>
            <div class="feature-card">
              <ion-icon :icon="bulbOutline" class="feature-icon"></ion-icon>
              <h3>{{ $t('userGuideTemplatesTitle') }}</h3>
              <p>{{ $t('userGuideTemplatesDescription') }}</p>
            </div>
          </div>
        </div>

        <!-- Getting Started -->
        <div class="section">
          <h2>{{ $t('userGuideGettingStartedTitle') }}</h2>
          <div class="steps">
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h3>{{ $t('userGuideStep1Title') }}</h3>
                <p>{{ $t('userGuideStep1Description') }}</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h3>{{ $t('userGuideStep2Title') }}</h3>
                <p>{{ $t('userGuideStep2Description') }}</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h3>{{ $t('userGuideStep3Title') }}</h3>
                <p>{{ $t('userGuideStep3Description') }}</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">4</div>
              <div class="step-content">
                <h3>{{ $t('userGuideStep4Title') }}</h3>
                <p>{{ $t('userGuideStep4Description') }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Deployment Guide -->
        <div class="section">
          <h2>{{ $t('userGuideDeploymentTitle') }}</h2>
          <p class="section-description">{{ $t('userGuideDeploymentDescription') }}</p>

          <!-- Philosophy -->
          <div class="deployment-section">
            <h3>{{ $t('userGuidePhilosophyTitle') }}</h3>
            <p>{{ $t('userGuidePhilosophyDescription') }}</p>
          </div>

          <!-- Gun-Ollama-Relay -->
          <div class="deployment-section">
            <h3>{{ $t('userGuideGunRelayTitle') }}</h3>
            <p>{{ $t('userGuideGunRelayDescription') }}</p>
            <p class="repo-link">{{ $t('userGuideGunRelayRepo') }}</p>
            
            <div class="platform-tabs">
              <!-- Linux -->
              <div class="platform-card">
                <h4>{{ $t('userGuideLinuxTitle') }}</h4>
                <ol class="command-list">
                  <li class="command-item"><code>{{ $t('userGuideLinuxStep1') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideLinuxStep2') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideLinuxStep3') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideLinuxStep4') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideLinuxStep5') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideLinuxStep6') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideLinuxStep7') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideLinuxStep8') }}</code></li>
                  <li class="command-item">{{ $t('userGuideLinuxStep9') }}</li>
                </ol>
              </div>
              
              <!-- macOS -->
              <div class="platform-card">
                <h4>{{ $t('userGuideMacosTitle') }}</h4>
                <ol class="command-list">
                  <li class="command-item"><code>{{ $t('userGuideMacosStep1') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideMacosStep2') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideMacosStep3') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideMacosStep4') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideMacosStep5') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideMacosStep6') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideMacosStep7') }}</code></li>
                  <li class="command-item">{{ $t('userGuideMacosStep8') }}</li>
                </ol>
              </div>
              
              <!-- Windows -->
              <div class="platform-card">
                <h4>{{ $t('userGuideWindowsTitle') }}</h4>
                <ol class="command-list">
                  <li class="command-item">{{ $t('userGuideWindowsStep1') }}</li>
                  <li class="command-item">{{ $t('userGuideWindowsStep2') }}</li>
                  <li class="command-item"><code>{{ $t('userGuideWindowsStep3') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideWindowsStep4') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideWindowsStep5') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideWindowsStep6') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideWindowsStep7') }}</code></li>
                  <li class="command-item">{{ $t('userGuideWindowsStep8') }}</li>
                </ol>
              </div>
            </div>

            <!-- Expected Output -->
            <div class="output-section">
              <h4>{{ $t('userGuideOutputTitle') }}</h4>
              <pre class="server-output">{{ $t('userGuideOutputContent') }}</pre>
            </div>
          </div>

          <!-- Ollama Installation -->
          <div class="deployment-section">
            <h3>{{ $t('userGuideOllamaTitle') }}</h3>
            <p>{{ $t('userGuideOllamaDescription') }}</p>
            
            <div class="platform-tabs">
              <!-- Ollama Linux -->
              <div class="platform-card">
                <h4>{{ $t('userGuideOllamaLinuxTitle') }}</h4>
                <ol class="command-list">
                  <li class="command-item"><code>{{ $t('userGuideOllamaLinuxStep1') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideOllamaLinuxStep2') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideOllamaLinuxStep3') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideOllamaLinuxStep4') }}</code></li>
                  <li class="command-item">{{ $t('userGuideOllamaLinuxStep5') }}</li>
                </ol>
              </div>
              
              <!-- Ollama macOS -->
              <div class="platform-card">
                <h4>{{ $t('userGuideOllamaMacosTitle') }}</h4>
                <ol class="command-list">
                  <li class="command-item">{{ $t('userGuideOllamaMacosStep1') }}</li>
                  <li class="command-item">{{ $t('userGuideOllamaMacosStep2') }}</li>
                  <li class="command-item"><code>{{ $t('userGuideOllamaMacosStep3') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideOllamaMacosStep4') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideOllamaMacosStep5') }}</code></li>
                  <li class="command-item">{{ $t('userGuideOllamaMacosStep6') }}</li>
                </ol>
              </div>
              
              <!-- Ollama Windows -->
              <div class="platform-card">
                <h4>{{ $t('userGuideOllamaWindowsTitle') }}</h4>
                <ol class="command-list">
                  <li class="command-item">{{ $t('userGuideOllamaWindowsStep1') }}</li>
                  <li class="command-item">{{ $t('userGuideOllamaWindowsStep2') }}</li>
                  <li class="command-item"><code>{{ $t('userGuideOllamaWindowsStep3') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideOllamaWindowsStep4') }}</code></li>
                  <li class="command-item"><code>{{ $t('userGuideOllamaWindowsStep5') }}</code></li>
                  <li class="command-item">{{ $t('userGuideOllamaWindowsStep6') }}</li>
                </ol>
              </div>
            </div>

            <!-- Recommended Models -->
            <div class="models-section">
              <h4>{{ $t('userGuideModelsTitle') }}</h4>
              <p>{{ $t('userGuideModelsDescription') }}</p>
              <ul class="models-list">
                <li class="model-item"><code>{{ $t('userGuideModel1') }}</code></li>
                <li class="model-item"><code>{{ $t('userGuideModel2') }}</code></li>
                <li class="model-item"><code>{{ $t('userGuideModel3') }}</code></li>
                <li class="model-item"><code>{{ $t('userGuideModel4') }}</code></li>
                <li class="model-item"><code>{{ $t('userGuideModel5') }}</code></li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Configuration Guide -->
        <div class="section">
          <h2>{{ $t('userGuideConfigTitle') }}</h2>
          <p class="section-description">{{ $t('userGuideConfigDescription') }}</p>

          <div class="config-section">
            <h3>{{ $t('userGuideApiTitle') }}</h3>
            <p>{{ $t('userGuideApiDescription') }}</p>
            <ol class="config-steps">
              <li class="config-step">{{ $t('userGuideApiStep1') }}</li>
              <li class="config-step">{{ $t('userGuideApiStep2') }}</li>
              <li class="config-step">{{ $t('userGuideApiStep3') }}</li>
              <li class="config-step"><code>{{ $t('userGuideApiStep4') }}</code></li>
              <li class="config-step"><code>{{ $t('userGuideApiStep5') }}</code></li>
              <li class="config-step">{{ $t('userGuideApiStep6') }}</li>
            </ol>
          </div>

          <div class="config-section">
            <h3>{{ $t('userGuideRelayTitle') }}</h3>
            <p>{{ $t('userGuideRelayDescription') }}</p>
            <ol class="config-steps">
              <li class="config-step">{{ $t('userGuideRelayStep1') }}</li>
              <li class="config-step">{{ $t('userGuideRelayStep2') }}</li>
              <li class="config-step"><code>{{ $t('userGuideRelayStep3') }}</code></li>
              <li class="config-step"><code>{{ $t('userGuideRelayStep4') }}</code></li>
              <li class="config-step">{{ $t('userGuideRelayStep5') }}</li>
            </ol>
          </div>
        </div>

        <!-- Contact -->
        <div class="section contact-section">
          <h2>{{ $t('userGuideContactTitle') }}</h2>
          <p>{{ $t('userGuideContactDescription') }}</p>
          <div class="contact-buttons">
            <ion-button @click="openGitHub" fill="outline">
              <ion-icon :icon="logoGithub" slot="start"></ion-icon>
              {{ $t('userGuideGithub') }}
            </ion-button>
            <ion-button @click="sendFeedback" fill="outline">
              <ion-icon :icon="mailOutline" slot="start"></ion-icon>
              {{ $t('userGuideFeedback') }}
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonBackButton
} from '@ionic/vue';
import { 
  sparklesOutline, shareOutline, chatbubblesOutline, imageOutline, eyeOutline,
  bulbOutline, logoGithub, mailOutline
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { showToast } from '@/composables/useToast';

const router = useRouter();

const shareGuide = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'TalkFlow User Guide',
        text: 'Learn how to use TalkFlow - AI Chat with Image Generation & Recognition',
        url: window.location.href
      });
    } catch (error) {
      // Error sharing
    }
  } else {
    // Fallback: copy URL to clipboard
    await navigator.clipboard.writeText(window.location.href);
    showToast('Guide URL copied to clipboard', 'success');
  }
};

const openGitHub = () => {
  window.open('https://github.com/ponzS/Gun-Ollama-Relay', '_blank');
};

const sendFeedback = () => {
  window.open('mailto:zhangguoai888@gmail.com?subject=TalkFlow Feedback', '_blank');
};
</script>

<style scoped>
.guide-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 16px;
}

.guide-header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 2rem 0;
}

.guide-icon {
  font-size: 4rem;
  color: var(--ion-color-primary);
  margin-bottom: 1rem;
}

.guide-header h1 {
  margin: 0 0 1rem 0;
  color: var(--ion-color-primary);
  font-size: 2.5rem;
  font-weight: 700;
}

.guide-description {
  font-size: 1.1rem;
  color: var(--ion-color-medium);
  line-height: 1.6;
  margin: 0;
}

.section {
  margin-bottom: 3rem;
}

.section h2 {
  color: var(--ion-color-primary);
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  font-weight: 600;
  border-bottom: 2px solid var(--ion-color-step-200);
  padding-bottom: 0.5rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.feature-card {
  background: var(--ion-color-step-50);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  border: 1px solid var(--ion-color-step-150);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 2.5rem;
  color: var(--ion-color-primary);
  margin-bottom: 1rem;
}

.feature-card h3 {
  margin: 0 0 0.5rem 0;
  color: var(--ion-color-primary);
  font-size: 1.2rem;
}

.feature-card p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
  line-height: 1.4;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: var(--ion-color-step-50);
  border-radius: 8px;
  border-left: 4px solid var(--ion-color-primary);
}

.step-number {
  width: 2rem;
  height: 2rem;
  background: var(--ion-color-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.step-content h3 {
  margin: 0 0 0.5rem 0;
  color: var(--ion-color-primary);
  font-size: 1.1rem;
}

.step-content p {
  margin: 0;
  color: var(--ion-color-medium);
  line-height: 1.5;
}

.image-guide {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 1.5rem;
}

.image-section h3 {
  color: var(--ion-color-primary);
  margin-bottom: 1rem;
}

.image-section ul {
  padding-left: 1.5rem;
  color: var(--ion-color-medium);
}

.image-section li {
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.settings-guide {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.setting-item {
  padding: 1rem;
  background: var(--ion-color-step-50);
  border-radius: 8px;
  border-left: 3px solid var(--ion-color-secondary);
}

.setting-item h3 {
  margin: 0 0 0.5rem 0;
  color: var(--ion-color-secondary);
}

.setting-item p {
  margin: 0;
  color: var(--ion-color-medium);
  line-height: 1.5;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.tip-card {
  padding: 1rem;
  background: var(--ion-color-success-tint);
  border-radius: 8px;
  border: 1px solid var(--ion-color-success);
}

.tip-card h3 {
  margin: 0 0 0.5rem 0;
  color: var(--ion-color-success-shade);
  font-size: 1rem;
}

.tip-card p {
  margin: 0;
  color: var(--ion-color-success-shade);
  font-size: 0.9rem;
  line-height: 1.4;
}

.faq {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.faq-item {
  padding: 1.5rem;
  background: var(--ion-color-step-50);
  border-radius: 8px;
  border-left: 3px solid var(--ion-color-warning);
}

.faq-item h3 {
  margin: 0 0 1rem 0;
  color: var(--ion-color-warning-shade);
  font-size: 1.1rem;
}

.faq-item p {
  margin: 0;
  color: var(--ion-color-medium);
  line-height: 1.5;
}

.contact-section {
  text-align: center;
  padding: 2rem;
  background: var(--ion-color-step-50);
  border-radius: 12px;
  border: 1px solid var(--ion-color-step-150);
}

.contact-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .feature-card,
  .step,
  .setting-item,
  .faq-item,
  .contact-section {
    background: var(--ion-color-step-100);
    border-color: var(--ion-color-step-200);
  }

  .tip-card {
    background: rgba(var(--ion-color-success-rgb), 0.1);
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .guide-container {
    padding: 0 8px;
  }

  .guide-header h1 {
    font-size: 2rem;
  }

  .section h2 {
    font-size: 1.5rem;
  }

  .feature-grid,
  .tips-grid {
    grid-template-columns: 1fr;
  }

  .image-guide {
    grid-template-columns: 1fr;
  }

  .contact-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .platform-tabs {
    grid-template-columns: 1fr;
  }
  
  .image-processing-grid {
    grid-template-columns: 1fr;
  }
}

/* Deployment Guide Styles */
.section-description {
  color: var(--ion-color-medium);
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.philosophy-card {
  background: linear-gradient(135deg, var(--ion-color-primary-tint) 0%, var(--ion-color-secondary-tint) 100%);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--ion-color-primary);
  text-align: center;
}

.philosophy-card h3 {
  color: var(--ion-color-primary-contrast);
  margin-bottom: 1rem;
  font-size: 1.4rem;
}

.philosophy-card p {
  color: var(--ion-color-primary-contrast);
  opacity: 0.9;
  font-size: 1.1rem;
}

.deployment-section {
  margin-bottom: 3rem;
  padding: 2rem;
  background: var(--ion-color-step-50);
  border-radius: 12px;
  border: 1px solid var(--ion-color-step-150);
}

.deployment-section h3 {
  color: var(--ion-color-primary);
  margin-bottom: 1rem;
  font-size: 1.5rem;
  border-bottom: 2px solid var(--ion-color-primary);
  padding-bottom: 0.5rem;
}

.repo-link {
  color: var(--ion-color-tertiary);
  font-weight: 500;
  margin-bottom: 1.5rem;
  font-family: 'Courier New', monospace;
}

.platform-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin: 1.5rem 0;
}

.platform-card {
  background: var(--ion-background-color);
  border-radius: 8px;
  padding: 1.5rem;
  border: 2px solid var(--ion-color-step-200);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.platform-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--ion-color-primary);
}

.platform-card h4 {
  color: var(--ion-color-secondary);
  margin-bottom: 1rem;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.command-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.command-item {
  margin-bottom: 0.8rem;
  padding: 0.5rem;
  background: var(--ion-color-step-100);
  border-radius: 6px;
  border-left: 3px solid var(--ion-color-success);
}

.command-item code {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: var(--ion-color-success-shade);
  font-weight: 500;
  word-break: break-all;
}

.output-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--ion-color-step-100);
  border-radius: 8px;
  border: 1px solid var(--ion-color-step-200);
}

.output-section h4 {
  color: var(--ion-color-warning-shade);
  margin-bottom: 1rem;
}

.server-output {
  background: #1a1a1a;
  color: #00ff00;
  padding: 1rem;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.4;
  overflow-x: auto;
  white-space: pre-wrap;
  border: 1px solid #333;
}

.models-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--ion-color-tertiary-tint);
  border-radius: 8px;
  border: 1px solid var(--ion-color-tertiary);
}

.models-section h4 {
  color: var(--ion-color-tertiary-shade);
  margin-bottom: 1rem;
}

.models-list {
  list-style: none;
  padding: 0;
}

.model-item {
  margin-bottom: 0.8rem;
  padding: 0.8rem;
  background: var(--ion-background-color);
  border-radius: 6px;
  border-left: 4px solid var(--ion-color-tertiary);
}

.model-item code {
  font-family: 'Courier New', monospace;
  color: var(--ion-color-tertiary-shade);
  font-weight: 500;
}

/* Configuration Styles */
.config-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--ion-color-step-50);
  border-radius: 8px;
  border-left: 4px solid var(--ion-color-secondary);
}

.config-section h3 {
  color: var(--ion-color-secondary);
  margin-bottom: 1rem;
}

.config-steps {
  padding-left: 1.5rem;
  color: var(--ion-color-medium);
}

.config-step {
  margin-bottom: 0.8rem;
  line-height: 1.5;
  padding: 0.5rem;
  background: var(--ion-color-step-100);
  border-radius: 4px;
  margin-left: -1.5rem;
  padding-left: 2rem;
}

/* Feature Guide Styles */
.feature-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--ion-color-step-50);
  border-radius: 8px;
  border: 1px solid var(--ion-color-step-150);
}

.feature-section h3 {
  color: var(--ion-color-primary);
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.benefits-list, .capabilities-list {
  list-style: none;
  padding: 0;
}

.benefit-item, .capability-item {
  margin-bottom: 0.8rem;
  padding: 0.8rem;
  background: var(--ion-color-success-tint);
  border-radius: 6px;
  border-left: 4px solid var(--ion-color-success);
  color: var(--ion-color-success-shade);
}

.image-processing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.processing-card {
  background: var(--ion-background-color);
  border-radius: 8px;
  padding: 1.5rem;
  border: 2px solid var(--ion-color-step-200);
}

.processing-card h4 {
  color: var(--ion-color-tertiary);
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.processing-card ul {
  list-style: none;
  padding: 0;
}

.feature-item {
  margin-bottom: 0.6rem;
  padding: 0.6rem;
  background: var(--ion-color-tertiary-tint);
  border-radius: 4px;
  color: var(--ion-color-tertiary-shade);
  font-size: 0.9rem;
}

/* Dark mode enhancements */
@media (prefers-color-scheme: dark) {
  .philosophy-card {
    background: linear-gradient(135deg, rgba(var(--ion-color-primary-rgb), 0.2) 0%, rgba(var(--ion-color-secondary-rgb), 0.2) 100%);
  }
  
  .server-output {
    background: #0a0a0a;
    border-color: #444;
  }
  
  .platform-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .deployment-section,
  .config-section,
  .feature-section {
    background: var(--ion-color-step-100);
    border-color: var(--ion-color-step-200);
  }
}
</style>