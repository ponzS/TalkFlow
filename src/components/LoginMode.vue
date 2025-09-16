<template>
  <ion-page>
    <ion-content>
      <!-- 3D Background -->
      <div class="aurora-background">
        <canvas ref="canvas" />
      </div>

      <!-- Swipe Container -->
      <div class="swipe-container" 
           @touchstart="handleTouchStart" 
           @touchmove="handleTouchMove" 
           @touchend="handleTouchEnd"
           @wheel="handleWheel">
        
        <!-- Pages Container -->
        <div class="pages-wrapper" :style="{ transform: `translateX(${-currentPage * 100}vw)` }">
          
          <!-- Page 0: TalkFlow Logo -->
          <div class="page" :class="{ active: currentPage === 0 }">
            <div class="page-content">
              <div class="logo-section">
                <div class="main-logo">
                  <div class="talkflow-title-text logo-text">
                    <p ><span style="color: black">Talk</span><span>Flow</span></p>
                  </div>
                  <!-- <div class="logo-subtitle">
                    <ClientOnly>
                      <MorphingText :texts="['Decentralized', 'Communication', 'Platform']" />
                    </ClientOnly>
                  </div> -->
                </div>
                
             
              </div>
            </div>
          </div>

          <!-- Page 1: Welcome & Language -->
          <div class="page" :class="{ active: currentPage === 1 }">
            <div class="page-content">
              <div class="title-section">
              </div>
              
              <div class="language-card" :class="{ 'slide-in': currentPage === 1, 'slide-out': currentPage !== 1 }">
                <div class="card-header">
                  <!-- <div class="card-icon">🌍</div> -->
                  <div class="card-title">

                  <ClientOnly>
                      <MorphingText :texts="['TalkFlow','Pigeon','Gun','Gun-Vue','SEA','E2EE','D-AI','Robot','Relay','DeSoc', 'Freedom','Unity','Human']" />
                    </ClientOnly>
                  </div>
                  <!-- <div class="card-title">{{ $t('language') }}</div> -->
                  <div class="card-subtitle">{{ $t('hello') }}</div>
                </div>
                
                <div class="language-grid">
                  <div
                    class="language-option"
                    v-for="lang in languages"
                    :key="lang.code"
                    @click="selectLanguage(lang)"
                    :class="{ active: lang.code === selectedLanguage }"
                  >
                    <span class="language-name">{{ lang.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Page 2: User Manual -->
          <div class="page" :class="{ active: currentPage === 2 }">
            <div class="page-content">
              <div class="flip-card" :class="{ flipped: showManualPanel }">
                <div class="flip-card-inner">
                  <!-- 正面 -->
                  <div class="flip-card-front" @click="toggleManualPanel">
                    <div class="card-icon">📋</div>
                    <div class="card-title">{{ $t('userAgreement') }}</div>
                    <div class="card-subtitle">{{ $t('termsAndFeaturesGuide') }}</div>
                    <div class="card-notice">{{ $t('successfulLoginImpliesAgreement') }}</div>
                  </div>
                  <!-- 背面 -->
                  <div class="flip-card-back manual-back" @click.stop="" @mousedown.stop="" @touchstart.stop="" @touchmove.stop="">
                    <div class="flip-card-controls">
                      <div class="back-btn" @click="toggleManualPanel">
                        <ion-icon :icon="chevronBackOutline"></ion-icon>
                      </div>
                    </div>
                    <div class="flip-card-header">
                      <div class="card-title">{{ $t('userAgreementAndFeatures') }}</div>
                      <div class="manual-page-indicator">
                        <span v-for="(page, index) in 6" :key="index" 
                              class="page-dot" 
                              :class="{ active: manualCurrentPage === index }"
                              @click="navigateManualPage(index)">
                        </span>
                      </div>
                    </div>
                    
                    <div class="manual-content">
                      <!-- 第一页：静态显示，支持多语言，无需懒加载 -->
                      <div v-if="manualCurrentPage === 0" class="manual-page">
                        <div class="manual-section">
                          <h4>🌐 {{ safeT('decentralizedDesign', 'Decentralized Design') }}</h4>
                          <p>{{ safeT('decentralizedDesignDesc', 'TalkFlow runs on a peer-to-peer network built with Gun.js. Your data is distributed across nodes, ensuring no single point of failure. You have complete control over your digital identity and communications.') }}</p>
                          <br/>
                        </div>
                        <div class="manual-section">
                          <h4>🔐 {{ safeT('endToEndEncryption', 'End-to-End Encryption') }}</h4>
                          <p>{{ safeT('endToEndEncryptionDesc', 'All messages, files, and communications are encrypted using SEA cryptography. Only you and the intended recipient can decrypt and read your content. Your privacy is mathematically guaranteed.') }}</p>
                          <br/>  
                        </div>
                        <div class="manual-section">
                          <h4>🤖 {{ safeT('aiIntegration', 'AI Integration') }}</h4>
                          <p>{{ safeT('aiIntegrationDesc', 'Enhanced with local and cloud AI capabilities, supporting intelligent conversations, image generation, and content recognition. AI processing runs securely without compromising your privacy.') }}</p>
                        </div>
                      </div>
                      
                      <!-- 第二页及以后：懒加载内容 -->
                      <div v-else-if="manualCurrentPage > 0">
                        <div v-if="isManualPageLoading" class="manual-loading">
                          <div class="loading-spinner"></div>
                          <p>{{ $t('loading') || 'Loading...' }}</p>
                        </div>
                        
                        <div v-else-if="currentManualPageContent" class="manual-page">
                          <div 
                            v-for="(section, index) in currentManualPageContent.sections" 
                            :key="index"
                            class="manual-section"
                          >
                            <h4>{{ section.icon }} {{ section.title }}</h4>
                            <p v-if="index === currentManualPageContent.sections.length - 1 && manualCurrentPage === 2">
                              <strong>{{ section.content }}</strong>
                            </p>
                            <p v-else-if="index === currentManualPageContent.sections.length - 1 && manualCurrentPage === 5">
                              <strong>{{ section.content }}</strong>
                            </p>
                            <p v-else>{{ section.content }}</p>
                            <br v-if="index < currentManualPageContent.sections.length - 1"/>
                          </div>
                        </div>
                        
                        <div v-else class="manual-error">
                          <p>Content loading failed, please retry</p>
                          <button @click="reloadCurrentPage" class="retry-btn">
                            Reload
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div class="manual-navigation">
                      <button class="nav-btn-small" v-if="manualCurrentPage > 0" @click="navigateManualPage('prev')">
                        <ion-icon :icon="chevronBackOutline"></ion-icon>
                      </button>
                      <span class="page-info">{{ manualCurrentPage + 1 }} / 6</span>
                      <button class="nav-btn-small" v-if="manualCurrentPage < 5" @click="navigateManualPage('next')">
                        <ion-icon :icon="chevronForwardOutline"></ion-icon>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Page 3: Authentication (Login & Register) -->
          <div class="page" :class="{ active: currentPage === 3 }">
            <div class="page-content auth-page" :class="{ 'has-generated-content': encryptedKeyPair && showRegisterPanel }">
              
              <!-- Login Card -->
              <div class="flip-card auth-card login-card" 
                   :class="{ 
                     flipped: showLoginPanel, 
                     'move-up': selectedAuthCard === 'register' && showRegisterPanel,
                     'selected': selectedAuthCard === 'login',
                     'has-input-content': encryptedKeyInput && encryptedKeyInput.trim().length > 0,
                     'input-focused': isAnyInputFocused && selectedAuthCard === 'login'
                   }">
                <div class="flip-card-inner">
                  <!-- 正面   <div class="card-subtitle">{{ $t('loginWithKey') || 'Import your key' }}</div>-->
                  <div class="flip-card-front" @click="selectLoginCard">
                    <div class="card-icon">🔑</div>
                    <div class="card-title">{{ $t('login') || 'Login' }}</div>
                   
                  </div>
                  <!-- 背面 -->
                  <div class="flip-card-back login-back" @click.stop="" @mousedown.stop="" @touchstart.stop="" @touchmove.stop="">
                    <div class="flip-card-controls">
                      <div class="back-btn" @click="resetAuthCards">
                        <ion-icon :icon="chevronBackOutline"></ion-icon>
                      </div>
                    </div>
                    <div class="flip-card-header">
                      <div class="card-title">{{ $t('loginToTalkFlow') }}</div>
                    </div>
                    
                    <div class="avatarteam" v-if="encryptedKeyInput">
                      <object class="avatar1" type="image/svg+xml" :key="jsonkeypair" :data="gunAvatar({ pub: jsonkeypair, svg: 'interactive', dark: isDark, p3: true, embed: true, }as any)"></object>
                      <object class="avatar" type="image/svg+xml" :key="jsonkeypair" :data="gunAvatar({ pub: jsonkeypair, svg: 'interactive', dark: isDark, p3: true, embed: true, }as any)"></object>
                    </div>

                    <div v-if="isKeyPair" class="floating-label-container" style="margin: 8px 0">
                      <textarea v-model="encryptedKeyInput" @focus="setFocus('encryptedKeyInput')" @blur="removeFocus('encryptedKeyInput')" style="background-color: rgba(0,0,0,0.3); color: #efefef8e"></textarea>
                      <label :class="{ active: isFocused.encryptedKeyInput || encryptedKeyInput }">{{ $t('key') }}</label>
                    </div>
                    
                    <div v-if="loginError" style="color: red; margin-top: 8px">{{ loginError }}</div>
                    
                    <div class="qr-options" style="gap:10px">
                      <ion-button color="dark" @click="KeyPairShow" style="flex: 1;">
                        <ion-icon :icon="keyOutline"></ion-icon>
                      </ion-button>
                      
                      <!-- <ion-button color="dark" @click="passKeyLogin" style="flex: 1;">
                        <ion-icon :icon="keyOutline"></ion-icon>
                      </ion-button> -->
                      <ion-button color="dark" @click="scanQRCode" style="flex: 1;">
                        <ion-icon :icon="scanOutline"></ion-icon>
                      </ion-button>
                      <ion-button color="dark" @click="pickFromGallery" style="flex: 1;">
                        <ion-icon :icon="imageOutline"></ion-icon>
                      </ion-button>
                    </div>

                    <ion-button v-if="encryptedKeyInput" color="dark" @click="simpleLogin(encryptedKeyInput)" style="margin-top: 8px">{{ $t('login') }}</ion-button>
                  </div>
                </div>
              </div>

              <!-- Register Card -->
              <div class="flip-card auth-card register-card" 
                   :class="{ 
                     flipped: showRegisterPanel, 
                     'has-content': encryptedKeyPair,
                     'move-down': selectedAuthCard === 'login' && showLoginPanel,
                     'selected': selectedAuthCard === 'register',
                     'input-focused': isAnyInputFocused && selectedAuthCard === 'register'
                   }">
                <div class="flip-card-inner">
                  <!-- 正面 -->
                  <div class="flip-card-front" @click="selectRegisterCard">
                    <div class="card-icon">✨</div>
                    <div class="card-title">{{ $t('register') || 'Create Account' }}</div>
                    <!-- <div class="card-subtitle">{{ $t('generateNewKey') || 'Generate new key' }}</div> -->
                  </div>
                  <!-- 背面 -->
                  <div class="flip-card-back register-back" @click.stop="" @mousedown.stop="" @touchstart.stop="" @touchmove.stop="">
                    <div class="flip-card-controls">
                      <div class="back-btn" @click="resetAuthCards">
                        <ion-icon :icon="chevronBackOutline"></ion-icon>
                      </div>
                    </div>
                    <div class="flip-card-header">
                      <div class="card-title">{{ $t('createNewAccount') }}</div>
                    </div>
                    
                    <div class="floating-label-container">
                      <input v-model="newAlias" @focus="setFocus('newAlias')" @blur="removeFocus('newAlias')" placeholder="" style="background-color: rgba(0,0,0,0.3);" />
                      <label :class="{ active: isFocused.newAlias || newAlias }">{{ $t('username') }}</label>
                    </div>

                    <ion-button color="dark" expand="block" @click="KeyCardDown" style="margin-top: 8px; font-weight: 700">
                      <ion-icon :icon="sparklesOutline" style="margin-right:5px"></ion-icon>
                      {{ encryptedKeyPair ? $t('regenerateAvatar') : $t('generateAvatar') }}
                    </ion-button>
               

                    <div v-if="encryptedKeyPair" class="generated-content">
                      <div class="avatarteam">
                        <img :src="avatarurl" class="avatar1" />
                        <object class="avatar" type="image/svg+xml" :key="temppub!" :data="gunAvatar({ pub: temppub, svg: 'interactive', dark: isDark, p3: true, embed: true, }as any)"></object>
                      </div>

                      <h4>{{ $t('keyColon') }}</h4>
                      <div class="key-display">
                        <p>{{ encryptedKeyPair }}</p>
                      </div>
                      
                      <ion-button color="dark" expand="block" @click="copyPub(encryptedKeyPair)">
                        <ion-icon :icon="copyOutline" style="margin-right:5px"></ion-icon>
                        {{ $t('copy') }}
                      </ion-button>
                      
                      <div style="height:5px"/>
                      
                      <ion-button color="dark" expand="block" @click="simpleLogin(encryptedKeyPair)">
                        <ion-icon :icon="keyOutline" style="margin-right:5px"></ion-icon>
                        {{ $t('login') }}
                      </ion-button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- Page 4: Settings & EULA -->
          <div class="page" :class="{ active: currentPage === 4 }">
            <div class="page-content">
              <div class="flip-card" :class="{ flipped: showSettingsPanel }">
                <div class="flip-card-inner">
                  <!-- 正面 -->
                  <div class="flip-card-front" @click="toggleSettingsPanel">
                    <div class="card-icon">🎨</div>
                    <div class="card-title">{{ $t('themes') || 'Color Themes' }}</div>
                    <div class="card-subtitle">{{ $t('customizeColors') || 'Customize your experience' }}</div>
                  </div>
                  <!-- 背面 -->
                  <div class="flip-card-back settings-back" @click.stop="" @mousedown.stop="" @touchstart.stop="" @touchmove.stop="">
                    <div class="flip-card-controls">
                      <div class="back-btn" @click="toggleSettingsPanel">
                        <ion-icon :icon="chevronBackOutline"></ion-icon>
                      </div>
                    </div>
                    <div class="flip-card-header">
                      <div class="card-title">{{ $t('colorThemes') }}</div>
                    </div>
                    
                    <div class="themes-grid">
                      <div class="theme-item" @click="setPonzsColors" :class="{ active: selectedColor === 'ponzs' }">
                        <div class="theme-preview ponzs-preview"></div>
                        <div class="theme-name">{{ $t('talkflowTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setPurpleColors" :class="{ active: selectedColor === 'purple' }">
                        <div class="theme-preview purple-preview"></div>
                        <div class="theme-name">{{ $t('purpleTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setNeonColors" :class="{ active: selectedColor === 'neon' }">
                        <div class="theme-preview neon-preview"></div>
                        <div class="theme-name">{{ $t('neonTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setAuroraColors" :class="{ active: selectedColor === 'aurora' }">
                        <div class="theme-preview aurora-preview"></div>
                        <div class="theme-name">{{ $t('auroraTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setSunsetColors" :class="{ active: selectedColor === 'sunset' }">
                        <div class="theme-preview sunset-preview"></div>
                        <div class="theme-name">{{ $t('blackWhiteTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setDeepSpaceColors" :class="{ active: selectedColor === 'deepSpace' }">
                        <div class="theme-preview space-preview"></div>
                        <div class="theme-name">{{ $t('deepSpaceTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setFireColors" :class="{ active: selectedColor === 'fire' }">
                        <div class="theme-preview fire-preview"></div>
                        <div class="theme-name">{{ $t('fireTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setOceanColors" :class="{ active: selectedColor === 'ocean' }">
                        <div class="theme-preview ocean-preview"></div>
                        <div class="theme-name">{{ $t('oceanTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setForestColors" :class="{ active: selectedColor === 'forest' }">
                        <div class="theme-preview forest-preview"></div>
                        <div class="theme-name">{{ $t('forestTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setCosmicColors" :class="{ active: selectedColor === 'cosmic' }">
                        <div class="theme-preview cosmic-preview"></div>
                        <div class="theme-name">{{ $t('cosmicTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setGoldColors" :class="{ active: selectedColor === 'gold' }">
                        <div class="theme-preview gold-preview"></div>
                        <div class="theme-name">{{ $t('goldTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setRoseColors" :class="{ active: selectedColor === 'rose' }">
                        <div class="theme-preview rose-preview"></div>
                        <div class="theme-name">{{ $t('roseTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setEmeraldColors" :class="{ active: selectedColor === 'emerald' }">
                        <div class="theme-preview emerald-preview"></div>
                        <div class="theme-name">{{ $t('emeraldTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setMysticalColors" :class="{ active: selectedColor === 'mystical' }">
                        <div class="theme-preview mystical-preview"></div>
                        <div class="theme-name">{{ $t('mysticalTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setGlacierColors" :class="{ active: selectedColor === 'glacier' }">
                        <div class="theme-preview glacier-preview"></div>
                        <div class="theme-name">{{ $t('glacierTheme') }}</div>
                      </div>
                      
                      <div class="theme-item" @click="setVolcanicColors" :class="{ active: selectedColor === 'volcanic' }">
                        <div class="theme-preview volcanic-preview"></div>
                        <div class="theme-name">{{ $t('volcanicTheme') }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Page Indicators -->
        <div class="page-indicators">
          <div 
            v-for="(page, index) in pageNames" 
            :key="index"
            class="indicator" 
            :class="{ active: currentPage === index }"
            @click="goToPage(index)"
          >
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="navigation-buttons" :class="{ 'home-page': currentPage === 0 }">
          <div class="nav-btn left" v-if="currentPage > 0" @click="previousPage">
            <ion-icon :icon="chevronBackOutline"></ion-icon>
          </div>
          <div class="nav-btn right" v-if="currentPage < pageNames.length - 1" @click="nextPage">
            <ion-icon :icon="chevronForwardOutline"></ion-icon>
          </div>
        </div>
      </div>




    </ion-content>
  </ion-page>
</template>

<style scoped>

/* 新的滑动页面样式 */
.swipe-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  z-index: 10;
}

.pages-wrapper {
  display: flex;
  width: 500vw; /* 5个页面 */
  height: 100vh;
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* 注册页面需要支持滚动 */
.page:nth-child(4) {
  overflow-y: auto;
}

.page-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 90%;
  max-width: 500px;
  z-index: 20;
  min-height: 60vh;
}

/* 标题区域 */
.title-section {
  text-align: center;
  margin-bottom: 40px;
}

/* 语言选择卡片样式 */
.language-card {
  background: #000000be;
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 30px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  /* transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s ease; */
  width: 100%;
  max-width: 600px;
  margin: 20px auto;
  
  /* 初始状态：在页面底部外侧 */
  /* transform: translateY(150vh);
  opacity: 0; */
}

/* 滑入动画 */
/* .language-card.slide-in {
  transform: translateY(-2vh);
  opacity: 1;
} */

/* 滑出动画 */
/* .language-card.slide-out {
  transform: translateY(150vh);
  opacity: 0;
} */

/* 卡片头部样式 */
.language-card .card-header {
  text-align: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

/* 卡片图标、标题、副标题样式 */
.language-card .card-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.language-card .card-title {
  font-size: 1rem;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
  width: 100%;
  
}

.language-card .card-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
}

/* 用户手册卡片翻转后上移 */
.page:nth-child(3) .flip-card.flipped {
  transform: translateY(-30vh);
}

/* 设置主题卡片翻转后适度上移 */
.page:nth-child(5) .flip-card.flipped {
  transform: translateY(-35vh);
}

/* Logo页面专用样式 */
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  text-align: center;
}

.main-logo {
  margin-bottom: 30px;
  
}

.logo-text {
  font-size: 20vw;
  /* margin-bottom: 10px; */
}

.logo-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 10px;
}

.logo-features {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 60px;
  flex-wrap: wrap;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.feature-name {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  text-align: center;
}

.continue-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 15px 25px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 25px;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.continue-hint:active {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.hint-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  font-weight: 500;
}

.hint-arrow {
  color: #00fff2;
  font-size: 1.2rem;
  font-weight: bold;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
}

.talkflow-title-text {
  font-size: 15vw;
  font-weight: bold;
  color: transparent;
  text-shadow: 0 0 10px 0 rgba(0, 255, 217, 0.5);
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0);
  background: linear-gradient(-45deg, #52eed1, #000000, #23d5b4, #23d5ab);
  -webkit-background-clip: text;
  background-clip: text;
  background-size: 200% 200%;
  animation: gradientBreath 10s ease infinite;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
  margin-bottom: 20px;
}

@keyframes gradientBreath {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 翻转卡片样式 */
.flip-card {
  background: transparent;
  width: 100%;
  max-width: 450px;
  margin: 20px auto;
  perspective: 1000px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  text-align: center;
  transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-style: preserve-3d;
}

/* 卡片高度和位置动画 */
.flip-card {
  transition: height 0.3s ease-in-out, transform 0.5s ease-in-out;
}

.flip-card.flipped {
  height: auto;
}

/* 注册卡片有内容时上移 */
.flip-card.has-content.flipped {
  transform: translateY(-3vh);
}

/* 生成内容的入场动画 */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 调整有内容时的页面布局 */
.page-content.has-generated-content {
  padding-top: 2vh;
  padding-bottom: 25vh;
  overflow-y: auto;
  max-height: none;
  height: auto;
  min-height: 100vh;
  justify-content: flex-start;
}

/* 生成内容样式 */
.generated-content {
  margin-top: 8px;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 19px;
  color: #efefef8e;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideInUp 0.5s ease-out;
}

.generated-content h4 {
  margin: 15px 0 10px 0;
  color: #fff;
  font-size: 1.1rem;
}

.key-display {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.key-display p {
  word-break: break-all;
  max-height: 100px;
  overflow-y: auto;
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.4;
  font-family: 'Courier New', monospace;
}

/* 自定义滚动条 */
.key-display p::-webkit-scrollbar {
  width: 4px;
}

.key-display p::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.key-display p::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.key-display p::-webkit-scrollbar-thumb:active {
  background: rgba(255, 255, 255, 0.3);
}

.flip-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front, .flip-card-back {
  backface-visibility: hidden;
  background: #000000be;
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 30px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.5s ease;
  width: 100%;
  box-sizing: border-box;
}

.flip-card-front {
  transform: rotateY(0deg);
  cursor: pointer;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.flip-card-back {
  position: absolute;
  top: 0;
  left: 0;
  transform: rotateY(180deg);
  min-height: fit-content;
  padding: 25px;
}

/* 移除固定高度，让内容决定卡片大小 */
.flip-card-back.login-back,
.flip-card-back.register-back,
.flip-card-back.settings-back {
  padding: 25px;
}

/* 触摸效果 */
.flip-card:active .flip-card-front {
  transform: translateY(-5px) rotateY(0deg);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.flip-card:active .flip-card-back {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.card-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
}

.card-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
}

.card-notice {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 10px;
  font-style: italic;
  text-align: center;
}

/* 卡片控制按钮 */
.flip-card-controls {
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 10;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.3s ease;
  user-select: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.back-btn:active {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.back-btn:active {
  transform: scale(0.95);
}

/* 卡片内容样式 */
.flip-card-header {
  margin-bottom: 20px;
  margin-top: 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 10px;
  text-align: center;
}

.flip-card-header .card-title {
  margin-bottom: 0;
}

/* 确保翻转过程中的正确交互 */
.flip-card:not(.flipped) .flip-card-back {
  pointer-events: none;
}

.flip-card.flipped .flip-card-front {
  pointer-events: none;
}

/* 背面卡片的内容不应触发翻转 */
.flip-card-back {
  cursor: default;
}

.flip-card-back * {
  cursor: default;
}

/* 输入框和按钮恢复正常光标 */
.flip-card-back input,
.flip-card-back textarea,
.flip-card-back button,
.flip-card-back ion-button,
.flip-card-back .language-option,
.flip-card-back .setting-item,
.flip-card-back .back-btn {
  cursor: pointer !important;
}

.flip-card-back input:focus,
.flip-card-back textarea:focus {
  cursor: text !important;
}

/* 彻底阻止事件冒泡 */
.flip-card-back {
  pointer-events: all;
}

.flip-card-back * {
  pointer-events: auto;
}

/* 调整卡片在不同状态下的Z-index */
.flip-card-front {
  z-index: 2;
}

.flip-card-back {
  z-index: 1;
}

.flip-card.flipped .flip-card-front {
  z-index: 1;
}

.flip-card.flipped .flip-card-back {
  z-index: 2;
}



/* 语言网格 */
.language-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
  margin-top: 15px;
}

.language-option {
  background: rgba(0, 255, 242, 0.8);
  color: black;
  padding: 12px 8px;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  font-size: 0.9rem;
}

.language-option:active {
  transform: scale(1.05);
  background: rgba(0, 255, 242, 1);
}

.language-option.active {
  background: rgba(0, 0, 0, 0.8);
  color: white;
}

/* 页面指示器 */
.page-indicators {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 30;
}

.indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator.active {
  background: #00fff2;
  transform: scale(1.3);
}

/* 导航按钮 - 移动到底部 */
.navigation-buttons {
  position: fixed;
  bottom: 80px; /* 在页面指示器上方 */
  left: 0;
  right: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 30px;
  z-index: 25;
  pointer-events: none;
}

/* 首页导航按钮靠右 */
.navigation-buttons.home-page {
  justify-content: flex-end;
}

.navigation-buttons.home-page .nav-btn.right {
  margin: 0;
}

.nav-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
  pointer-events: auto;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.nav-btn:active {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.nav-btn:active {
  transform: scale(0.95);
}

/* 设置项样式 */
.setting-item {
  display: flex;
  align-items: center;
  padding: 15px;
  margin: 10px 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.setting-item:active {
  background: rgba(255, 255, 255, 0.2);
}

.setting-icon {
  font-size: 2rem;
  margin-right: 15px;
}

.setting-text {
  flex: 1;
}

.setting-title {
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
}

.setting-subtitle {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

/* 主题网格样式 */
.themes-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 15px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 5px;
}

/* 主题网格滚动条样式 */
.themes-grid::-webkit-scrollbar {
  width: 4px;
}

.themes-grid::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.themes-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.themes-grid::-webkit-scrollbar-thumb:active {
  background: rgba(255, 255, 255, 0.5);
}

.theme-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  border: 2px solid transparent;
}

.theme-item:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.theme-item.active {
  border-color: #00fff2;
  background: rgba(0, 255, 242, 0.1);
}

.theme-preview {
  width: 60px;
  height: 40px;
  border-radius: 8px;
  margin: 0 auto 10px;
  position: relative;
  overflow: hidden;
}

.theme-name {
  font-size: 0.9rem;
  font-weight: bold;
  color: white;
}

/* 各种主题预览色彩 */
.ponzs-preview {
  background: linear-gradient(135deg, #20e6df, #af2ab8, #6d274f);
}

.purple-preview {
  background: linear-gradient(135deg, #d8a7f7, #9b7bde, #7c56b8);
}

.neon-preview {
  background: linear-gradient(135deg, #00f0ff, #00b8b8, #005555);
}

.aurora-preview {
  background: linear-gradient(135deg, #ffc0cb, #ffa7c7, #ff77a9);
}

.sunset-preview {
  background: linear-gradient(135deg, #000000, #808080, #ffffff);
}

.space-preview {
  background: linear-gradient(135deg, #132742, #2e1b47, #005555);
}

.fire-preview {
  background: linear-gradient(135deg, #ff4500, #ff6347, #dc143c);
}

.ocean-preview {
  background: linear-gradient(135deg, #006994, #4682b4, #87ceeb);
}

.forest-preview {
  background: linear-gradient(135deg, #228b22, #32cd32, #9acd32);
}

.cosmic-preview {
  background: linear-gradient(135deg, #4b0082, #8a2be2, #9370db);
}

.gold-preview {
  background: linear-gradient(135deg, #ffd700, #daa520, #b8860b);
}

.rose-preview {
  background: linear-gradient(135deg, #ff69b4, #ff1493, #dc143c);
}

.emerald-preview {
  background: linear-gradient(135deg, #50c878, #00ff7f, #00fa9a);
}

.mystical-preview {
  background: linear-gradient(135deg, #6a0dad, #9932cc, #ba55d3);
}

.glacier-preview {
  background: linear-gradient(135deg, #b0e0e6, #87cefa, #4169e1);
}

.volcanic-preview {
  background: linear-gradient(135deg, #8b0000, #ff4500, #ff8c00);
}

/* 头像样式保持不变 */
.avatarteam {
  width: 100%;
  margin: 10px auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.avatar {
  position: absolute;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  margin: 0 auto;
  z-index: 3;
  overflow: hidden;
}

.avatar1 {
  margin: 10px;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  filter: blur(10px);
  background-color: black;
  z-index: 1;
  overflow: hidden;
}

/* Aurora 3D Background */
.aurora-background {
  width: 100vw;
  height: 100vh;
  margin: 0;
  position: fixed;
  top: 0;
  left: 0;
  background-color: transparent;
  z-index: -1;
  overflow: hidden;
  background: black;
}

canvas {
  width: 100vw !important;
  height: 100vh !important;
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  filter: blur(20px);
  
}

@media (max-width: 768px) {
  .aurora-background {
    transform: scale(1);
  }
  
  .logo-text {
    font-size: 25vw;
  }
  
  .logo-features {
    gap: 20px;
    margin-bottom: 40px;
  }
  
  .feature-item {
    min-width: 80px;
  }
  
  .feature-icon {
    font-size: 2rem;
  }
  
  .feature-name {
    font-size: 0.8rem;
  }
  
  /* 移动端语言选择卡片优化 */
  .language-card {
    max-width: 95%;
    margin: 10px auto;
    padding: 20px;
  }
  
  .language-card .card-header {
    margin-bottom: 20px;
    padding-bottom: 12px;
  }
  
  .language-card .card-icon {
    font-size: 2.5rem;
  }
  
  .language-card .card-title {
    font-size: 1.3rem;
  }
  
  .language-card .card-subtitle {
    font-size: 0.9rem;
  }
  
  .page-content {
    width: 95%;
    min-height: 50vh;
  }
  
  /* 移动端返回按钮优化 */
  .flip-card-controls {
    top: 10px;
    left: 10px;
  }
  
  .back-btn {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  /* 移动端内容生成时的卡片调整 */
  .flip-card.has-content.flipped {
    transform: translateY(-5vh);
  }
  
  .page-content.has-generated-content {
    padding-top: 1vh;
    padding-bottom: 30vh;
    min-height: 100vh;
    height: auto;
    max-height: none;
    justify-content: flex-start;
  }
  
  /* 移动端生成内容优化 */
  .generated-content {
    padding: 12px;
  }
  
  .key-display {
    padding: 10px;
  }
  
  .key-display p {
    max-height: 80px;
    font-size: 0.8rem;
  }
  
  .language-grid {
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 6px;
  }
  
  .language-option {
    padding: 10px 6px;
    font-size: 0.8rem;
  }

  /* 移动端用户手册优化 */
  .manual-content {
    max-height: 300px;
  }

  .manual-section {
    padding: 12px;
    margin-bottom: 15px;
  }

  .manual-section h4 {
    font-size: 1rem;
  }

  .manual-section p {
    font-size: 0.85rem;
  }

  /* 移动端认证页面优化 */
  .auth-card {
    max-width: 95%;
  }

  .login-card {
    top: 15vh;
  }

  .register-card {
    top: 50vh;
  }

  /* 移动端选中卡片居中 */
  .auth-card.selected.login-card {
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
  }

  .auth-card.selected.register-card {
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
  }

  /* 移动端翻转后位置微调 */
  /* 登录卡片有输入内容时 */
  .auth-card.selected.flipped.login-card.has-input-content {
    transform: translateX(-50%) translateY(-110%);
  }

  /* 注册卡片生成密钥对时 */
  .auth-card.selected.has-content.flipped.register-card {
    transform: translateX(-50%) translateY(-190%);
  }

  /* 登录卡片普通翻转状态 */
  .auth-card.selected.flipped.login-card:not(.has-input-content) {
    transform: translateX(-50%) translateY(-50%);
  }

  /* 注册卡片普通翻转状态 */
  .auth-card.selected.flipped.register-card:not(.has-content) {
    transform: translateX(-50%) translateY(-50%);
  }

  /* 移动端导航按钮优化 */
  .navigation-buttons {
    bottom: 60px;
    padding: 0 20px;
  }

  /* 移动端首页导航按钮靠右 */
  .navigation-buttons.home-page {
    justify-content: flex-end;
    padding-right: 20px;
    padding-left: 0;
  }

  .nav-btn {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }

  /* 移动端主题网格优化 */
  .themes-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    max-height: 500px;
  }

  .theme-item {
    padding: 8px;
  }

  .theme-preview {
    width: 40px;
    height: 30px;
  }

  .theme-name {
    font-size: 0.7rem;
  }

  /* 移动端设置主题卡片翻转后适度上移 */
  .page:nth-child(5) .flip-card.flipped {
    transform: translateY(-30vh);
  }

  /* 移动端输入框聚焦状态下的卡片位置调整 */
  .auth-card.selected.input-focused {
    top: 20vh !important;
    transform: translateX(-50%) translateY(0) !important;
  }

  /* 移动端输入框聚焦状态下的翻转卡片 */
  .auth-card.selected.input-focused.flipped {
    top: 20vh !important;
    transform: translateX(-50%) translateY(0) !important;
  }

  /* 移动端输入框聚焦状态下的登录卡片有内容 */
  .auth-card.selected.input-focused.has-input-content.flipped {
    top: 20vh !important;
    transform: translateX(-50%) translateY(0) !important;
  }

  /* 移动端输入框聚焦状态下的注册卡片有内容 */
  .auth-card.selected.input-focused.has-content.flipped {
    top: 20vh !important;
    transform: translateX(-50%) translateY(0) !important;
  }

  /* 移动端用户手册分页优化 */
  .manual-page {
    min-height: 300px;
  }

  .manual-section {
    padding: 10px;
    margin-bottom: 12px;
  }

  .manual-section h4 {
    font-size: 0.95rem;
  }

  .manual-section p {
    font-size: 0.8rem;
  }

  .manual-navigation {
    margin-top: 10px;
  }

  .nav-btn-small {
    width: 30px;
    height: 30px;
    font-size: 1rem;
  }

  .page-info {
    font-size: 0.8rem;
  }

  .page-dot {
    width: 10px;
    height: 10px;
  }

  /* 移动端用户手册卡片翻转后上移 */
  .page:nth-child(3) .flip-card.flipped {
    transform: translateY(-30vh);
  }
}

/* 浮动标签容器样式 */
.floating-label-container {
  position: relative;
  transition: all 0.3s ease-in-out;
  margin: 8px 0;
}

.floating-label-container input,
.floating-label-container textarea {
  width: 100%;
  padding: 16px;
  font-size: 15px;
  background-color: #000000;
  color: rgb(141, 141, 141);
  border: none;
  border-radius: 15px;
  outline: none;
  transition: all 0.3s ease-in-out;
}

.floating-label-container textarea {
  resize: none;
}

.floating-label-container label {
  position: absolute;
  left: 14px;
  top: 14px;
  color: rgb(141, 141, 141);
  pointer-events: none;
  transition: all 0.3s ease;
}

.floating-label-container label.active {
  top: -10px;
  left: 5px;
  font-size: 12px;
  color: #efefef8e;
  padding: 0 3px;
}

/* QR扫描选项按钮容器 */
.qr-options {
  display: flex;
  justify-content: space-between;
  margin: 12px 0 8px 0;
  width: 100%;
}



/* 扫描二维码时隐藏背景元素 */
.hidden-during-scan {
  display: none !important;
}

/* 用户手册样式 */
.manual-content {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 10px;
}

.manual-section {
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border-left: 3px solid #00fff2;
}

.manual-section h4 {
  margin: 0 0 10px 0;
  color: #00fff2;
  font-size: 1.1rem;
}

.manual-section p {
  margin: 0;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
}

/* 懒加载状态样式 */
.manual-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid #00fff2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.manual-loading p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 0;
}

/* 错误状态样式 */
.manual-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 20px;
  text-align: center;
}

.manual-error p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 0 0 15px 0;
}

.retry-btn {
  padding: 8px 16px;
  background: rgba(0, 255, 242, 0.1);
  border: 1px solid #00fff2;
  border-radius: 8px;
  color: #00fff2;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  background: rgba(0, 255, 242, 0.2);
}

.retry-btn:active {
  background: rgba(0, 255, 242, 0.3);
  transform: scale(0.95);
}

/* 用户手册分页样式 */
.manual-page-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
}

.page-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.page-dot.active {
  background: #00fff2;
  transform: scale(1.3);
}

.page-dot:active {
  background: rgba(255, 255, 255, 0.6);
}

.manual-page {
  min-height: 300px;
  animation: fadeInSlide 0.3s ease-in-out;
}

@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.manual-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-btn-small {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn-small:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.nav-btn-small:active {
  transform: scale(0.95);
}

.page-info {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  font-weight: 500;
}

/* 认证页面样式 */
.auth-page {
  position: relative;
  height: 100vh;
  overflow: visible;
}

.auth-card {
  position: absolute;
  width: 100%;
  max-width: 400px;
  left: 50%;
  transform: translateX(-50%);
  transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  z-index: 5;
}

.login-card {
  top: 20vh;
}

.register-card {
  top: 55vh;
}

/* 卡片移动动画 */
.auth-card.move-up {
  transform: translateX(-50%) translateY(-120vh);
  opacity: 0.3;
}

.auth-card.move-down {
  transform: translateX(-50%) translateY(120vh);
  opacity: 0.3;
}

/* 选中的卡片移动到页面中心 */
.auth-card.selected.login-card {
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
  z-index: 10;
}

.auth-card.selected.register-card {
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
  z-index: 10;
}

/* 登录卡片有输入内容时的位置调整 */
.auth-card.selected.flipped.login-card.has-input-content {
  transform: translateX(-50%) translateY(-120%);
}

/* 注册卡片生成密钥对时的位置调整 */
.auth-card.selected.has-content.flipped.register-card {
  transform: translateX(-50%) translateY(-200%);
}

/* 登录卡片普通翻转状态 */
.auth-card.selected.flipped.login-card:not(.has-input-content) {
  transform: translateX(-50%) translateY(-50%);
}

/* 注册卡片普通翻转状态 */
.auth-card.selected.flipped.register-card:not(.has-content) {
  transform: translateX(-50%) translateY(-50%);
}

/* 输入框聚焦状态下的卡片位置调整 */
.auth-card.selected.input-focused {
  top: 20vh !important;
  transform: translateX(-50%) translateY(0) !important;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* 输入框聚焦状态下的翻转卡片 */
.auth-card.selected.input-focused.flipped {
  top: 20vh !important;
  transform: translateX(-50%) translateY(0) !important;
}

/* 输入框聚焦状态下的登录卡片有内容 */
.auth-card.selected.input-focused.has-input-content.flipped {
  top: 20vh !important;
  transform: translateX(-50%) translateY(0) !important;
}

/* 输入框聚焦状态下的注册卡片有内容 */
.auth-card.selected.input-focused.has-content.flipped {
  top: 20vh !important;
  transform: translateX(-50%) translateY(0) !important;
}
</style>

<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import { useLanguage } from '@/composables/useLanguage';
import { useI18n } from 'vue-i18n';
import { ref, onMounted, onBeforeUnmount, computed, nextTick, shallowRef } from 'vue'
import * as THREE from 'three'
import {  reactive, watch } from 'vue'
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { useRouter } from 'vue-router'
import { scanOutline, imageOutline, fingerPrintOutline,keyOutline, copyOutline, sparklesOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import jsQR from 'jsqr';
import { gunAvatar } from "gun-avatar";
import { useTheme } from '@/composables/useTheme';

const chatFlow = getTalkFlowCore();
const canvas = ref<HTMLCanvasElement | null>(null);
const { isDark } = useTheme();


const router = useRouter()

// 新的滑动页面状态
const currentPage = ref(0)
const pageNames = ['Logo', 'Welcome', 'Manual', 'Auth', 'Themes']
const showLoginPanel = ref(false)
const showRegisterPanel = ref(false)
const showSettingsPanel = ref(false)
const showManualPanel = ref(false)
const selectedAuthCard = ref('') // 'login' or 'register'
const manualCurrentPage = ref(0) // 用户手册分页

// 触摸事件变量
const touchStartX = ref(0)
const touchStartY = ref(0)
const isDragging = ref(false)



const {
  copyPub,
  newAlias,
  newPassphrase,
  generateMsg,
  encryptedKeyPair,
  generateKeyPair,
  passphrase,
  encryptedKeyInput,
  importKeyPair,
  isLoggedIn,
  currentUserPub,
  currentUserAlias,
  loginError,
  KeyDown,
  temppub,
  simpleLogin,
  triggerLightHaptic
  // generateKeyPairFaceId,
  // importKeyPairFaceId


} = chatFlow 


const isKeyPair = ref(false)
function KeyPairShow() {
 isKeyPair.value = !isKeyPair.value
 // 如果关闭输入框，同时清空内容
 if (!isKeyPair.value) {
   encryptedKeyInput.value = '';
 }
}

let jsonkeypair: Ref<any> = ref('');


  function parseEncryptedKeyInput(): void {
  try {
    if (!encryptedKeyInput.value.trim()) {
      jsonkeypair.value = '';
      return;
    }
    const parsedObject: { pub?: string } = JSON.parse(encryptedKeyInput.value);
    const pubString: string | null = parsedObject.pub || null;
    if (!pubString) {
      throw new Error("Pub field is missing or invalid");
    }
    jsonkeypair.value = pubString;
  } catch (error: unknown) {
    jsonkeypair.value = '';
  }
}

// watch(encryptedKeyInput, parseEncryptedKeyInput);
//     return { encryptedKeyInput, jsonkeypair };

watch(encryptedKeyInput, (newValue: string) => {
  try {
    if (!newValue.trim()) {
      jsonkeypair.value = '';
      return;
    }
    const parsedObject: { pub?: string } = JSON.parse(newValue);
    const pubString: string | null = parsedObject.pub || null;
    if (!pubString) {
      throw new Error("Pub field is missing or invalid");
    }
    jsonkeypair.value = pubString;
  } catch (error: unknown) {
    jsonkeypair.value = '';
  }
});

// 监听当前页面，首页特殊处理
watch(currentPage, (newPage: number) => {
  if (newPage === 0) {
    // 首页：先触发随机颜色，再设置霓虹色
    setActionColor();
    setTimeout(() => {
      setNeonColors();
    }, 150);
  }
});

// 新增：输入框聚焦状态管理，用于控制浮动标签效果
const isFocused = reactive({
  passphrase: false,
  encryptedKeyInput: false,
  newAlias: false,
  newPassphrase: false,
})

function setFocus(field: 'passphrase' | 'encryptedKeyInput' | 'newAlias' | 'newPassphrase') {
  isFocused[field] = true
}

function removeFocus(field: 'passphrase' | 'encryptedKeyInput' | 'newAlias' | 'newPassphrase') {
  isFocused[field] = false
}

// 计算属性：检测是否有任何输入框处于聚焦状态
const isAnyInputFocused = computed(() => {
  return Object.values(isFocused).some(focused => focused)
})

// 计算属性：检测是否有任何面板展开（不包括语言选择，因为它不是面板）
const isAnyPanelOpen = computed(() => {
  return showLoginPanel.value || 
         showRegisterPanel.value || 
         showSettingsPanel.value || 
         showManualPanel.value
})

const avatarurl = computed(() => 
gunAvatar({ 
  pub: temppub.value, 
  round: false, 
  dark: isDark.value, 
  // svg: true,
  p3: true,
  embed: true,
 } as any ));
const texts = [
  "TalkFlow",
  "Gun",
  "SEA",
  "D-AI",
  "Robot",
  "Decentralized",
  "Drones",
  "Relay",
  "Freedom",
];
const texts1 = [
'Hello, World ! ', // 英文
  '你好, 世界 ! ', // 中文
  'Привет, мир ! ', // 俄语
  'Hallo Welt ! ', // 德语
  'Bonjour le monde ! ', // 法语
  'こんにちは、世界 ! ', // 日语
  'مرحبا بالعالم ! ', // 阿拉伯语
  '¡Hola, Mundo! ', // 西班牙语
  'Ciao, Mondo! ', // 意大利语
  'नमस्ते, दुनिया! ', // 印度语
];

// 登录逻辑
const OnLongin = async () => {
  setActionColor(); // 登录动作颜色变换
  await importKeyPair();
  if (isLoggedIn.value === true) {
    setSuccessColor(); // 成功颜色变换
    await router.replace('/index');
  } else {
    setFireColors(); // 错误颜色变换
  }
};
// 生成密钥对
const KeyCardDown = () => {
  setGoldColors(); // 生成密钥对时使用金色
  generateKeyPair()
}

const purpleColors = {
  color1: new THREE.Color(0xd8a7f7), // 淡紫色
  color2: new THREE.Color(0x9b7bde), // 柔和的紫色
  color3: new THREE.Color(0x7c56b8), // 浅紫色
}
const purpleColors1 = {
  color1: new THREE.Color(0xd8a7f7), // 淡紫色
  color2: new THREE.Color(0x9b7bde), // 柔和的紫色
  color3: new THREE.Color(0x7c56b8), // 浅紫色
}

const neonColors = {
  color1: new THREE.Color(0x00f0ff), // 明亮的蓝色
  color2: new THREE.Color(0x00b8b8), // 蓝绿色
  color3: new THREE.Color(0x005555), // 深色调
}

const auroraColors = {
  color1: new THREE.Color(0xffc0cb), // 浅粉色
  color2: new THREE.Color(0xffa7c7), // 柔和的粉色
  color3: new THREE.Color(0xff77a9), // 中等粉色
}

const sunsetColors = {
  color1: new THREE.Color(0x000000), // 纯黑色
  color2: new THREE.Color(0x808080), // 中灰色
  color3: new THREE.Color(0xffffff), // 纯白色
}
// const vibrantOrangeColors = {
//   color1: new THREE.Color(0xff6600), // 深橙色
//   color2: new THREE.Color(0xff9900), // 明亮的橙黄色
//   color3: new THREE.Color(0xffcc00), // 明黄色
//   color4: new THREE.Color(0xff5733), // 较深的红橙色
//   color5: new THREE.Color(0xd35400), // 暗橙色
//   color6: new THREE.Color(0x8b3e2f), // 带点红棕色的暗橙色
// }
const deepSpaceColors = {
  color1: new THREE.Color(0x132742), // 深空蓝
  color2: new THREE.Color(0x2e1b47), // 深紫色
  color3: new THREE.Color(0x005555), // 黑色
}
const ponzsColors = {
  color1: new THREE.Color(0x20e6df),
  color2: new THREE.Color(0xaf2ab8),
  color3: new THREE.Color(0x6d274f),
}
const ponzsColors1 = {
  color1: new THREE.Color(0x20e6df),
  color2: new THREE.Color(0xaf2ab8),
  color3: new THREE.Color(0x6d274f),
}

// 新增更多配色方案
const fireColors = {
  color1: new THREE.Color(0xff4500), // 火焰橙
  color2: new THREE.Color(0xff6347), // 番茄红
  color3: new THREE.Color(0xdc143c), // 深红色
}
const oceanColors = {
  color1: new THREE.Color(0x006994), // 深海蓝
  color2: new THREE.Color(0x4682b4), // 钢蓝色
  color3: new THREE.Color(0x87ceeb), // 天空蓝
}
const forestColors = {
  color1: new THREE.Color(0x228b22), // 森林绿
  color2: new THREE.Color(0x32cd32), // 柠檬绿
  color3: new THREE.Color(0x9acd32), // 黄绿色
}
const cosmicColors = {
  color1: new THREE.Color(0x4b0082), // 靛蓝色
  color2: new THREE.Color(0x8a2be2), // 蓝紫色
  color3: new THREE.Color(0x9370db), // 中紫色
}
const goldColors = {
  color1: new THREE.Color(0xffd700), // 金色
  color2: new THREE.Color(0xdaa520), // 金棒色
  color3: new THREE.Color(0xb8860b), // 暗金色
}
const roseColors = {
  color1: new THREE.Color(0xff69b4), // 热粉色
  color2: new THREE.Color(0xff1493), // 深粉色
  color3: new THREE.Color(0xdc143c), // 猩红色
}
const emeraldColors = {
  color1: new THREE.Color(0x50c878), // 翡翠绿
  color2: new THREE.Color(0x00ff7f), // 春绿色
  color3: new THREE.Color(0x00fa9a), // 中春绿
}
const mysticalColors = {
  color1: new THREE.Color(0x6a0dad), // 蓝紫色
  color2: new THREE.Color(0x9932cc), // 暗兰花紫
  color3: new THREE.Color(0xba55d3), // 中兰花紫
}
const glacierColors = {
  color1: new THREE.Color(0xb0e0e6), // 粉蓝色
  color2: new THREE.Color(0x87cefa), // 淡天蓝色
  color3: new THREE.Color(0x4169e1), // 皇家蓝
}
const volcanicColors = {
  color1: new THREE.Color(0x8b0000), // 暗红色
  color2: new THREE.Color(0xff4500), // 橙红色
  color3: new THREE.Color(0xff8c00), // 暗橙色
}
// 当前和目标色系
const colors = ref(ponzsColors)
const targetColors = ref(ponzsColors)
const transitionSpeed = 0.05 // 渐变速度

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let clock: THREE.Clock
let object: THREE.Mesh




// 初始化 Three.js 场景
const initThreeJS = (canvas: HTMLCanvasElement) => {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  clock = new THREE.Clock()

  createAuroraObject()

  camera.position.set(0, 0, 23)
  camera.lookAt(0, 0, 0)

  animate()
}

// 创建动态物体
const createAuroraObject = () => {
  const geometry = new THREE.IcosahedronGeometry(10, 4)
  geometry.computeVertexNormals()

  const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader(),
    fragmentShader: fragmentShader(),
    uniforms: {
      time: { value: 0 },
      color1: { value: colors.value.color1 },
      color2: { value: colors.value.color2 },
      color3: { value: colors.value.color3 },
    },
    side: THREE.DoubleSide,
    wireframe: false,
  })

  object = new THREE.Mesh(geometry, material)
  scene.add(object)
}

// 顶点着色器
const vertexShader = () => `
  uniform float time;
  varying vec3 vPosition;
  varying float vNoise;
  void main() {
    vPosition = position;
    vNoise = sin(position.x * 10.0 + time) * 0.5;
    vec3 newPosition = position + normal * vNoise;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`

// 片段着色器
const fragmentShader = () => `
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  varying float vNoise;
  void main() {
    vec3 color = mix(color1, color2, vNoise);
    color = mix(color, color3, abs(sin(vNoise * 2.0)));
    gl_FragColor = vec4(color, 1.0);
  }
`

// 动画循环
const animate = () => {
  requestAnimationFrame(animate)

  const time = clock.getElapsedTime()
  const material = object.material as THREE.ShaderMaterial
  material.uniforms.time.value = time

  // 更新颜色渐变
  updateColorTransition()

  object.rotation.x += 0.002
  object.rotation.y += 0.002

  renderer.render(scene, camera)
}

// 颜色渐变：每一帧逐步插值至目标颜色
const updateColorTransition = () => {
  colors.value.color1.lerpHSL(targetColors.value.color1, transitionSpeed)
  colors.value.color2.lerpHSL(targetColors.value.color2, transitionSpeed)
  colors.value.color3.lerpHSL(targetColors.value.color3, transitionSpeed)

  const material = object.material as THREE.ShaderMaterial
  material.uniforms.color1.value = colors.value.color1
  material.uniforms.color2.value = colors.value.color2
  material.uniforms.color3.value = colors.value.color3
}

// 窗口大小变化时，更新渲染器和摄像机
const onWindowResize = () => {
  if (renderer && camera) {
    const width = window.innerWidth
    const height = window.innerHeight

    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
}
const selectedColor = ref<string>('purple')
// 色系切换函数
const setDefaultColors = () => {
  targetColors.value = purpleColors
  selectedColor.value = 'purple'
}

const setPurpleColors = () => {
  targetColors.value = purpleColors1
  selectedColor.value = 'purple'
}

const setNeonColors = () => {
  targetColors.value = neonColors
  selectedColor.value = 'neon'
}

const setAuroraColors = () => {
  targetColors.value = auroraColors
  selectedColor.value = 'aurora'
}

const setSunsetColors = () => {
  targetColors.value = sunsetColors
  selectedColor.value = 'sunset'
}

const setDeepSpaceColors = () => {
  targetColors.value = deepSpaceColors
  selectedColor.value = 'deepSpace'
}

const setPonzsColors = () => {
  targetColors.value = ponzsColors
  selectedColor.value = 'ponzs'
}
const setPonzsColors1 = () => {
  targetColors.value = ponzsColors1
  selectedColor.value = 'ponzs1'
}

// 新增配色设置函数
const setFireColors = () => {
  targetColors.value = fireColors
  selectedColor.value = 'fire'
}

const setOceanColors = () => {
  targetColors.value = oceanColors
  selectedColor.value = 'ocean'
}

const setForestColors = () => {
  targetColors.value = forestColors
  selectedColor.value = 'forest'
}

const setCosmicColors = () => {
  targetColors.value = cosmicColors
  selectedColor.value = 'cosmic'
}

const setGoldColors = () => {
  targetColors.value = goldColors
  selectedColor.value = 'gold'
}

const setRoseColors = () => {
  targetColors.value = roseColors
  selectedColor.value = 'rose'
}

const setEmeraldColors = () => {
  targetColors.value = emeraldColors
  selectedColor.value = 'emerald'
}

const setMysticalColors = () => {
  targetColors.value = mysticalColors
  selectedColor.value = 'mystical'
}

const setGlacierColors = () => {
  targetColors.value = glacierColors
  selectedColor.value = 'glacier'
}

const setVolcanicColors = () => {
  targetColors.value = volcanicColors
  selectedColor.value = 'volcanic'
}

// 随机颜色变换函数
const colorFunctions = [
  setPonzsColors, setPurpleColors, setNeonColors, setAuroraColors, setSunsetColors, setDeepSpaceColors,
  setFireColors, setOceanColors, setForestColors, setCosmicColors, setGoldColors, setRoseColors,
  setEmeraldColors, setMysticalColors, setGlacierColors, setVolcanicColors
]

const setRandomColor = () => {
  const randomIndex = Math.floor(Math.random() * colorFunctions.length)
  colorFunctions[randomIndex]()
}

// 特定操作的颜色变换
const setCardActionColor = () => {
  const cardColors = [setAuroraColors, setNeonColors, setPurpleColors, setCosmicColors, setMysticalColors]
  const randomIndex = Math.floor(Math.random() * cardColors.length)
  cardColors[randomIndex]()
}

const setSuccessColor = () => {
  const successColors = [setEmeraldColors, setForestColors, setGoldColors]
  const randomIndex = Math.floor(Math.random() * successColors.length)
  successColors[randomIndex]()
}

const setActionColor = () => {
  const actionColors = [setFireColors, setVolcanicColors, setRoseColors, setOceanColors]
  const randomIndex = Math.floor(Math.random() * actionColors.length)
  actionColors[randomIndex]()
}



const { languages, selectedLanguage, selectLanguage: selectLang, initLanguage } = useLanguage();
const { t } = useI18n(); // 在顶层获取翻译函数

onMounted(async () => {
  await initLanguage(); // 确保语言初始化完成
  await nextTick(); // 等待 DOM 更新
  
  // 页面初始化随机颜色变换
  setRandomColor();
  
  // 设置初始页面主题
  switchPageTheme(currentPage.value);
  
  if (canvas.value) {
    try {
      await initThreeJS(canvas.value as HTMLCanvasElement);
      window.addEventListener('resize', onWindowResize);
      setSuccessColor(); // Three.js 初始化成功颜色变换
    } catch (err) {
      setFireColors(); // Three.js 初始化失败颜色变换
    }
  }
});



// 组件卸载时清理事件监听和计时器
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  
  // 清理用户手册防抖计时器
  if (manualLoadingDebounce.value) {
    clearTimeout(manualLoadingDebounce.value)
  }
})

// 扫描二维码的方法
const scanQRCode = async () => {
  try {
    setOceanColors(); // 扫描操作颜色变换
    
    // 检查权限
    const status = await BarcodeScanner.checkPermission({ force: true });
    
    if (status.granted) {
      // 准备扫描
      document.body.style.background = "transparent";
      document.querySelector('.aurora-background')?.classList.add('hidden-during-scan');
      document.querySelector('.aurora-background1')?.classList.add('hidden-during-scan');
      
      // 启动扫描
      BarcodeScanner.hideBackground();
      const result = await BarcodeScanner.startScan();
      
      // 处理扫描结果
      if (result.hasContent) {
        setSuccessColor(); // 扫描成功颜色变换
        encryptedKeyInput.value = result.content;
        isKeyPair.value = true; // 显示输入框
      }
    }
  } catch (error) {
  } finally {
    // 恢复界面
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.style.background = "";
    document.querySelector('.aurora-background')?.classList.remove('hidden-during-scan');
    document.querySelector('.aurora-background1')?.classList.remove('hidden-during-scan');
  }
};

// 从相册选择图片并解析二维码
const pickFromGallery = async () => {
  try {
    setGlacierColors(); // 相册选择颜色变换
    
    // 请求权限并打开相册
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });
    
    if (!image.dataUrl) {
      return;
    }
    
    // 创建Image对象用于加载图片
    const img = new Image();
    img.onload = () => {
      // 创建canvas并绘制图片
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0, img.width, img.height);
      
      // 获取图像数据
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // 使用jsQR库解析二维码
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (code) {
        // 二维码解析成功，将内容填充到输入框
        setEmeraldColors(); // 解析成功颜色变换
        encryptedKeyInput.value = code.data;
        isKeyPair.value = true; // 显示输入框
      } else {
        setVolcanicColors(); // 解析失败颜色变换
        alert('No QR code found');
      }
    };
    
    // 设置图片源并开始加载
    img.src = image.dataUrl;
    
  } catch (error) {
  }
};

// 新增：页面滑动和交互方法

const toggleLoginPanel = () => {
  triggerLightHaptic(); // 翻转卡片震动反馈
  setCardActionColor(); // 颜色变换
  showLoginPanel.value = !showLoginPanel.value;
};

const toggleRegisterPanel = () => {
  triggerLightHaptic(); // 翻转卡片震动反馈
  setCardActionColor(); // 颜色变换
  showRegisterPanel.value = !showRegisterPanel.value;
};

const toggleSettingsPanel = () => {
  triggerLightHaptic(); // 翻转卡片震动反馈
  setCardActionColor(); // 颜色变换
  showSettingsPanel.value = !showSettingsPanel.value;
};

const toggleManualPanel = async () => {
  triggerLightHaptic(); // 翻转卡片震动反馈
  setCardActionColor(); // 颜色变换
  showManualPanel.value = !showManualPanel.value;
  
  // 打开时加载当前页面内容（第一页无需加载，从第二页开始懒加载）
  if (showManualPanel.value && manualCurrentPage.value > 0) {
    await loadManualPage(manualCurrentPage.value);
  }
  
  if (!showManualPanel.value) {
    // 关闭时重置分页状态
    manualCurrentPage.value = 0;
  }
};

// 认证卡片选择函数
const selectLoginCard = () => {
  triggerLightHaptic(); // 认证卡片选择震动反馈
  setActionColor(); // 颜色变换
  selectedAuthCard.value = 'login';
  showLoginPanel.value = true;
  showRegisterPanel.value = false;
};

const selectRegisterCard = () => {
  triggerLightHaptic(); // 认证卡片选择震动反馈
  setActionColor(); // 颜色变换
  selectedAuthCard.value = 'register';
  showRegisterPanel.value = true;
  showLoginPanel.value = false;
};

const resetAuthCards = () => {
  triggerLightHaptic(); // 卡片重置震动反馈
  setRandomColor(); // 随机颜色变换
  selectedAuthCard.value = '';
  showLoginPanel.value = false;
  showRegisterPanel.value = false;
};

// 页面导航方法
const goToPage = (index: number) => {
  // 如果有面板展开，禁用页面切换
  if (isAnyPanelOpen.value) {
    return;
  }
  
  triggerLightHaptic(); // 页面切换震动反馈
  setRandomColor(); // 随机颜色变换
  currentPage.value = index;
  // 根据页面切换颜色主题
  switchPageTheme(index);
  // 确保首页始终使用默认配色
  ensureHomePageDefaultTheme();
  // 关闭所有展开的面板
  closeAllPanels();
};

const nextPage = () => {
  // 如果有面板展开，禁用页面切换
  if (isAnyPanelOpen.value) {
    return;
  }
  
  if (currentPage.value < pageNames.length - 1) {
    triggerLightHaptic(); // 页面切换震动反馈
    setActionColor(); // 动作颜色变换
    goToPage(currentPage.value + 1);
  }
};

const previousPage = () => {
  // 如果有面板展开，禁用页面切换
  if (isAnyPanelOpen.value) {
    return;
  }
  
  if (currentPage.value > 0) {
    triggerLightHaptic(); // 页面切换震动反馈
    setActionColor(); // 动作颜色变换
    goToPage(currentPage.value - 1);
  }
};

const closeAllPanels = () => {
  showLoginPanel.value = false;
  showRegisterPanel.value = false;
  showSettingsPanel.value = false;
  showManualPanel.value = false;
  selectedAuthCard.value = '';
  manualCurrentPage.value = 0; // 重置用户手册分页
};

// 页面主题切换
const switchPageTheme = (pageIndex: number) => {
  switch (pageIndex) {
    case 0: // Logo - 首页特殊处理
      setRandomColor(); // 先触发一次随机颜色变换
      setTimeout(() => {
        setNeonColors(); // 额外触发霓虹色
      }, 100);
      setTimeout(() => {
        setPonzsColors(); // 额外触发霓虹色
      }, 150);
      break;
    case 1: // Welcome
     // setAuroraColors();
      setNeonColors(); 
      break;
    case 2: // Manual
     // setNeonColors();
      setAuroraColors();
      break;
    case 3: // Auth (Login & Register)
    setGlacierColors(); 
     // setPurpleColors();
      break;
    case 4: // Themes
      setDeepSpaceColors();
    
      break;
    default:
   
      setPonzsColors();
  }
};

// 确保首页使用特殊配色处理
const ensureHomePageDefaultTheme = () => {
  if (currentPage.value === 0) {
    // 首页特殊处理：先变色再设置霓虹色
    setRandomColor();
    setTimeout(() => {
      setNeonColors();
    }, 200);
  }
};

// 触摸事件处理
const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX;
  touchStartY.value = e.touches[0].clientY;
  isDragging.value = false;
};

const handleTouchMove = (e: TouchEvent) => {
  // 如果有面板展开，禁用滑动页面切换
  if (isAnyPanelOpen.value) {
    return;
  }
  
  if (!isDragging.value) {
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX.value);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.value);
    
    // 只有水平滑动距离大于垂直滑动距离时才开始拖拽
    if (deltaX > deltaY && deltaX > 10) {
      isDragging.value = true;
    }
  }
};

const handleTouchEnd = (e: TouchEvent) => {
  // 如果有面板展开，禁用滑动页面切换
  if (isAnyPanelOpen.value) {
    isDragging.value = false;
    return;
  }
  
  if (!isDragging.value) return;
  
  const deltaX = e.changedTouches[0].clientX - touchStartX.value;
  const threshold = 50; // 滑动阈值
  
  if (Math.abs(deltaX) > threshold) {
    if (deltaX > 0) {
      // 向右滑动，上一页
      previousPage();
    } else {
      // 向左滑动，下一页
      nextPage();
    }
  }
  
  isDragging.value = false;
};

// 鼠标滚轮事件处理
const handleWheel = (e: WheelEvent) => {
  // 如果有面板展开，禁用滚轮页面切换
  if (isAnyPanelOpen.value) {
    return;
  }
  
  e.preventDefault();
  
  if (e.deltaX > 30) {
    nextPage();
  } else if (e.deltaX < -30) {
    previousPage();
  }
};

// 新增：用户手册懒加载系统
const manualPages = shallowRef<Record<number, any>>({})
const isManualPageLoading = ref(false)
const manualLoadingDebounce = ref<NodeJS.Timeout | null>(null)

// 懒加载用户手册页面内容（从第二页开始，第一页静态显示）
const loadManualPage = async (pageIndex: number, forceReload: boolean = false) => {
  // 第一页静态显示，无需懒加载
  if (pageIndex === 0) {
    return null;
  }
  
  if (!forceReload && manualPages.value[pageIndex] && !isManualPageLoading.value) {
    return manualPages.value[pageIndex]
  }
  
  if (isManualPageLoading.value) {
    return null;
  }
  isManualPageLoading.value = true
  
  try {
    // 强制重新加载时，清除缓存
    if (forceReload) {
      delete manualPages.value[pageIndex];
    }
    
    // 延迟加载，避免与3D渲染冲突
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const pageContent = await getManualPageContent(pageIndex, t)
    if (pageContent) {
      manualPages.value[pageIndex] = pageContent
    }
    
    return pageContent
  } catch (error) {
    return null
  } finally {
    isManualPageLoading.value = false
  }
}

// 安全的翻译函数，避免tokenizer错误
const safeT = (key: string, fallback: string): string => {
  try {
    if (typeof t === 'function') {
      const result = t(key);
      // 检查翻译结果是否有效
      if (result && typeof result === 'string' && result !== key) {
        return result;
      }
    }
    return fallback;
  } catch (error) {
    return fallback;
  }
};

// 获取手册页面内容（第二页开始的懒加载内容，支持多语言）
const getManualPageContent = async (pageIndex: number, t: any) => {
  try {
    // 第一页已在模板中静态显示，这里从第二页开始
    const contentMap: Record<number, any> = {
      1: {
        title: safeT('userAgreement', 'User Agreement'),
        sections: [
          {
            icon: '📋',
            title: safeT('userConductGuidelines', 'User Conduct Guidelines'),
            content: safeT('userConductGuidelinesDesc', 'You agree not to: post inappropriate content (hate speech, harassment, violence, pornography), engage in malicious behavior (spam, threats, malicious interference), or violate applicable laws.')
          },
          {
            icon: '🔒',
            title: safeT('privacyAndSecurity', 'Privacy & Security'),
            content: safeT('privacyAndSecurityDesc', 'We do not store your private keys or access your encrypted data. You are responsible for key management and security. Lost keys cannot be recovered - your data will be permanently inaccessible.')
          },
          {
            icon: '📞',
            title: safeT('contentModeration', 'Content Moderation'),
            content: safeT('contentModerationDesc', 'For public dynamic channels, we reserve the right to monitor and block violating content. For private nodes and communication features, you manage content yourself. Please report inappropriate behavior to zhangguoai888@gmail.com.')
          }
        ]
      },
      2: {
        title: safeT('legalTerms', 'Legal Terms'),
        sections: [
          {
            icon: '⚖️',
            title: safeT('legalTerms', 'Legal Terms'),
            content: safeT('legalTermsDesc', 'TalkFlow is provided "as is" without any warranties. We are not responsible for data loss, key loss, or third-party actions. Service availability may vary depending on network conditions.')
          },
          {
            icon: '🔄',
            title: safeT('agreementUpdates', 'Agreement Updates'),
            content: safeT('agreementUpdatesDesc', 'We may update these terms at any time. Continued use implies acceptance of updated terms. Changes will be announced through official channels.')
          },
          {
            icon: '⚠️',
            title: safeT('importantNotice', 'Important Notice'),
            content: safeT('importantNoticeDesc', 'Successful login implies acceptance of all terms and conditions. By continuing to log in, you confirm that you understand and agree to these terms.')
          }
        ]
      },
      3: {
        title: safeT('privacyPolicy', 'Privacy Policy'),
        sections: [
          {
            icon: '🔒',
            title: safeT('privacyProtection', 'Privacy Protection'),
            content: safeT('privacyProtectionDesc', 'TalkFlow uses end-to-end encryption technology. All your messages, files, and communications are encrypted locally before transmission. We cannot and will not access your private communication content.')
          },
          {
            icon: '📊',
            title: safeT('dataCollection', 'Data Collection'),
            content: safeT('dataCollectionDesc', 'We do not collect personal information, chat records, or message content. The decentralized architecture ensures your data is only distributed across network nodes you choose to connect to.')
          },
          {
            icon: '🌐',
            title: safeT('networkInformation', 'Network Information'),
            content: safeT('networkInformationDesc', 'For network functionality, we may process connection metadata (IP addresses, node status). This technical information is necessary for peer-to-peer communication but will not be associated with your identity.')
          },
          {
            icon: '🔐',
            title: safeT('keyManagement', 'Key Management'),
            content: safeT('keyManagementDesc', 'Your encryption keys are generated and stored locally on your device. We cannot access your private keys, so we cannot decrypt your data or recover lost keys.')
          }
        ]
      },
      4: {
        title: safeT('serviceTerms', 'Service Terms'),
        sections: [
          {
            icon: '🌟',
            title: safeT('serviceAvailability', 'Service Availability'),
            content: safeT('serviceAvailabilityDesc', 'TalkFlow runs on a decentralized network. Service availability depends on community-maintained network nodes. We strive to provide high availability but cannot guarantee uninterrupted access.')
          },
          {
            icon: '💾',
            title: safeT('dataPersistence', 'Data Persistence'),
            content: safeT('dataPersistenceDesc', 'Your data is distributed across network nodes. Data persistence depends on node operators and network health. We recommend regularly backing up important information and encryption keys.')
          },
          {
            icon: '🚫',
            title: safeT('serviceLimitations', 'Service Limitations'),
            content: safeT('serviceLimitationsDesc', 'In case of abuse, we reserve the right to restrict access to public relay nodes. Private nodes remain under your complete control. File size and transfer limits may apply based on network conditions.')
          },
          {
            icon: '🔧',
            title: safeT('technicalSupport', 'Technical Support'),
            content: safeT('technicalSupportDesc', 'Community-driven support is available through official channels. For technical issues, please check documentation first or contact: zhangguoai888@gmail.com')
          }
        ]
      },
      5: {
        title: safeT('disclaimer', 'Disclaimer'),
        sections: [
          {
            icon: '⚠️',
            title: safeT('disclaimer', 'Disclaimer'),
            content: safeT('disclaimerDesc', 'TalkFlow is provided "as is" and "as available" without any express or implied warranties. We do not guarantee that the service will be uninterrupted, error-free, or secure.')
          },
          {
            icon: '💰',
            title: safeT('limitationOfLiability', 'Limitation of Liability'),
            content: safeT('limitationOfLiabilityDesc', 'Under no circumstances shall TalkFlow developers be liable for any direct, indirect, incidental, special, or consequential damages arising from the use or inability to use this service.')
          },
          {
            icon: '🏛️',
            title: safeT('applicableLaw', 'Applicable Law'),
            content: safeT('applicableLawDesc', 'These terms are governed by applicable international laws. Disputes will be resolved through arbitration. If any provision is found invalid, the remaining provisions will continue to be effective.')
          },
          {
            icon: '✅',
            title: safeT('finalAgreement', 'Final Agreement'),
            content: safeT('finalAgreementDesc', 'By using TalkFlow, you indicate that you have read, understood, and agree to be bound by all terms and conditions outlined in this agreement. This constitutes the complete agreement between you and TalkFlow.')
          }
        ]
      }
    }
    
    const result = contentMap[pageIndex] || null
    return result
  } catch (error) {
    return null
  }
}

// 计算属性：当前页面内容（第一页静态显示，第二页开始使用懒加载内容）
const currentManualPageContent = computed(() => {
  // 第一页在模板中静态显示，不需要通过这里获取
  if (manualCurrentPage.value === 0) {
    return null;
  }
  return manualPages.value[manualCurrentPage.value] || null
})

// 优化后的用户手册分页导航（添加防抖）
const navigateManualPage = async (direction: 'prev' | 'next' | number) => {
  // 清除之前的防抖
  if (manualLoadingDebounce.value) {
    clearTimeout(manualLoadingDebounce.value)
  }
  
  // 防抖处理，避免频繁操作导致崩溃
  manualLoadingDebounce.value = setTimeout(async () => {
    try {
      // 减少震动和颜色变换频率，避免与Three.js冲突
      const shouldTriggerEffects = Math.random() > 0.7 // 30%概率触发效果
      if (shouldTriggerEffects) {
        triggerLightHaptic()
        setMysticalColors()
      }
      
      let targetPage = manualCurrentPage.value
      
      if (typeof direction === 'number') {
        targetPage = direction
      } else if (direction === 'prev' && manualCurrentPage.value > 0) {
        targetPage = manualCurrentPage.value - 1
      } else if (direction === 'next' && manualCurrentPage.value < 5) {
        targetPage = manualCurrentPage.value + 1
      }
      
      // 预加载目标页面内容（第一页静态显示无需加载）
      if (targetPage !== manualCurrentPage.value) {
        if (targetPage > 0) {
          await loadManualPage(targetPage)
        }
        manualCurrentPage.value = targetPage
        
        // 预加载相邻页面（缓存策略，跳过第一页）
        const preloadPages = []
        if (targetPage > 1) preloadPages.push(targetPage - 1) // 第一页静态显示，不需要预加载
        if (targetPage < 5) preloadPages.push(targetPage + 1)
        
        // 异步预加载，不阻塞主线程
        setTimeout(() => {
          preloadPages.forEach(page => {
            if (page > 0 && !manualPages.value[page]) { // 确保不预加载第一页
              loadManualPage(page)
            }
          })
        }, 100)
      }
    } catch (error) {
    }
  }, 150) // 150ms防抖
}

// 监听手册页面变化，自动加载内容（第一页静态显示，从第二页开始懒加载）
watch(manualCurrentPage, async (newPage) => {
  if (showManualPanel.value && newPage !== undefined && newPage > 0) {
    await loadManualPage(newPage)
  }
})

// 监听手册面板开关，初始化加载（第一页无需加载）
watch(showManualPanel, async (isOpen) => {
  if (isOpen && manualCurrentPage.value > 0 && !manualPages.value[manualCurrentPage.value]) {
    await loadManualPage(manualCurrentPage.value)
  }
})

// 重新加载当前页面内容（第一页静态显示无需重新加载）
const reloadCurrentPage = async () => {
  if (manualCurrentPage.value === 0) {
    return;
  }
  await loadManualPage(manualCurrentPage.value, true); // 强制重新加载
}

// 重新定义语言选择方法
const selectLanguage = (lang: { code: string; name: string; flag: string }) => {
  selectLang(lang);
  setSuccessColor(); // 语言选择成功颜色变换
};

</script> 