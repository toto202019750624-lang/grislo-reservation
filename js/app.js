/**
 * グリスロ予約システム - メインアプリケーション
 * 予約フォーム、カレンダー、データ管理を統合
 */

// ===================================
// グローバル状態
// ===================================
const AppState = {
  currentDate: new Date(),
  selectedDate: null,
  selectedTime: null,
  config: null,
  schedule: [],
  reservations: [],
  pickupLocations: [],
  currentStep: 1
};

// ===================================
// ユーティリティ関数
// ===================================
const Utils = {
  // 日付をYYYY-MM-DD形式にフォーマット
  formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 日付を日本語表示形式にフォーマット
  formatDateJP(date) {
    const d = new Date(date);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
  },

  // 予約IDを生成
  generateReservationId() {
    const date = new Date();
    const dateStr = this.formatDate(date).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RES-${dateStr}-${random}`;
  },

  // 日付が予約可能期間内かチェック
  isWithinBookingWindow(date, windowDays = 40) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + windowDays);
    return targetDate >= today && targetDate <= maxDate;
  },

  // キャンセル可能かチェック（前日まで）
  canCancel(reservationDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resDate = new Date(reservationDate);
    resDate.setHours(0, 0, 0, 0);
    const oneDayBefore = new Date(resDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    return today <= oneDayBefore;
  },

  // localStorageからデータを取得
  getFromStorage(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error('Storage read error:', e);
      return defaultValue;
    }
  },

  // localStorageにデータを保存
  saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Storage write error:', e);
      return false;
    }
  }
};

// ===================================
// データ管理
// ===================================
const DataManager = {
  // 設定を読み込み
  async loadConfig() {
    try {
      const response = await fetch('data/config.json');
      AppState.config = await response.json();
      return AppState.config;
    } catch (e) {
      console.error('Config load error:', e);
      // デフォルト設定を使用
      AppState.config = {
        settings: {
          serviceName: "町のグリスロ予約",
          vehicleCapacity: 6,
          maxPassengersPerReservation: 1,
          reservationWindowDays: 40,
          cancelDeadlineHours: 24,
          timeSlots: ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"]
        }
      };
      return AppState.config;
    }
  },

  // 運行スケジュールを読み込み（Supabase優先、フォールバックはlocalStorage）
  async loadSchedule() {
    // Supabaseから読み込み試行
    if (typeof SupabaseDB !== 'undefined') {
      const supabaseSchedule = await SupabaseDB.getSchedule();
      if (supabaseSchedule && supabaseSchedule.length > 0) {
        AppState.schedule = supabaseSchedule;
        // localStorageにも同期
        Utils.saveToStorage('grislo_schedule', supabaseSchedule);
        return AppState.schedule;
      }
    }

    // localStorageから読み込み
    const localSchedule = Utils.getFromStorage('grislo_schedule', null);
    if (localSchedule && localSchedule.length > 0) {
      AppState.schedule = localSchedule;
      return AppState.schedule;
    }

    // JSONファイルから読み込み
    try {
      const response = await fetch('data/schedule.json');
      const data = await response.json();
      AppState.schedule = data.operatingDays || [];
      return AppState.schedule;
    } catch (e) {
      console.error('Schedule load error:', e);
      AppState.schedule = [];
      return [];
    }
  },

  // 乗車場所リストを読み込み（Supabase優先、フォールバックはlocalStorage）
  async loadPickupLocations() {
    // Supabaseから読み込み試行
    if (typeof SupabaseDB !== 'undefined') {
      const supabaseLocations = await SupabaseDB.getPickupLocations();
      if (supabaseLocations && supabaseLocations.length > 0) {
        AppState.pickupLocations = supabaseLocations;
        // localStorageにも同期
        Utils.saveToStorage('grislo_locations', supabaseLocations);
        return AppState.pickupLocations;
      }
    }

    // localStorageから読み込み
    const localLocations = Utils.getFromStorage('grislo_locations', null);
    if (localLocations && localLocations.length > 0) {
      AppState.pickupLocations = localLocations;
      return AppState.pickupLocations;
    }

    // JSONファイルから読み込み
    try {
      const response = await fetch('data/pickupLocations.json');
      const data = await response.json();
      AppState.pickupLocations = data.locations || [];
      return AppState.pickupLocations;
    } catch (e) {
      console.error('Pickup locations load error:', e);
      AppState.pickupLocations = [];
      return [];
    }
  },

  // 予約データを読み込み（Supabase優先、フォールバックはlocalStorage）
  async loadReservations() {
    // Supabaseから読み込み試行
    if (typeof SupabaseDB !== 'undefined') {
      const supabaseReservations = await SupabaseDB.getReservations();
      if (supabaseReservations !== null) {
        AppState.reservations = supabaseReservations;
        // localStorageにも同期
        Utils.saveToStorage('grislo_reservations', supabaseReservations);
        return AppState.reservations;
      }
    }

    // localStorageから読み込み
    AppState.reservations = Utils.getFromStorage('grislo_reservations', []);
    return AppState.reservations;
  },

  // 予約を保存（SupabaseとlocalStorage両方に保存）
  async saveReservation(reservation) {
    // Supabaseに保存
    if (typeof SupabaseDB !== 'undefined') {
      await SupabaseDB.addReservation(reservation);
    }

    // ローカルにも保存
    AppState.reservations.push(reservation);
    Utils.saveToStorage('grislo_reservations', AppState.reservations);
    return reservation;
  },

  // 予約をキャンセル（SupabaseとlocalStorage両方を更新）
  async cancelReservation(reservationId) {
    // Supabaseを更新
    if (typeof SupabaseDB !== 'undefined') {
      await SupabaseDB.cancelReservation(reservationId);
    }

    // ローカルも更新
    const index = AppState.reservations.findIndex(r => r.id === reservationId);
    if (index !== -1) {
      AppState.reservations[index].status = 'cancelled';
      Utils.saveToStorage('grislo_reservations', AppState.reservations);
      return true;
    }
    return false;
  },

  // 予約を検索
  findReservation(reservationId) {
    return AppState.reservations.find(r => r.id === reservationId);
  },

  // 特定日の予約を取得
  getReservationsForDate(date) {
    const dateStr = Utils.formatDate(date);
    return AppState.reservations.filter(r => r.date === dateStr && r.status !== 'cancelled');
  },

  // 1時間帯あたりの定員を取得
  getTimeSlotCapacity() {
    return AppState.config?.settings?.vehicleCapacity || 6;
  },

  // 特定日時の予約数を取得
  getReservationCountForTimeSlot(date, time) {
    const reservations = this.getReservationsForDate(date);
    return reservations.filter(r => r.time === time).length;
  },

  // 特定日時の残り枠数を取得
  getTimeSlotRemainingSlots(date, time) {
    const capacity = this.getTimeSlotCapacity();
    const count = this.getReservationCountForTimeSlot(date, time);
    return capacity - count;
  },

  // 特定日時が満席かチェック（予約数が定員に達しているか）
  isTimeSlotBooked(date, time) {
    return this.getTimeSlotRemainingSlots(date, time) <= 0;
  },

  // 特定日時が予約可能かチェック
  canBookTimeSlot(date, time) {
    return this.getTimeSlotRemainingSlots(date, time) > 0;
  },

  // 特定日が運行日かチェック
  isOperatingDay(date) {
    const dateStr = Utils.formatDate(date);
    return AppState.schedule.some(s => s.date === dateStr && s.available);
  },

  // 特定日の運行時間を取得
  getTimeSlotsForDate(date) {
    const dateStr = Utils.formatDate(date);
    const scheduleDay = AppState.schedule.find(s => s.date === dateStr);
    if (scheduleDay && scheduleDay.timeSlots) {
      return scheduleDay.timeSlots;
    }
    // デフォルトの時間スロットを使用
    return AppState.config?.settings?.timeSlots || ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
  },

  // 特定日時の予約を取得
  getReservationForTimeSlot(date, time) {
    const reservations = this.getReservationsForDate(date);
    return reservations.find(r => r.time === time);
  },

  // 名前を匿名化（A〜Zで表示）
  anonymizeName(index) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[index % 26] + 'さん';
  },

  // 特定日の予約一覧を匿名化して取得
  getAnonymizedReservationsForDate(date) {
    const reservations = this.getReservationsForDate(date);
    return reservations.map((r, index) => ({
      ...r,
      displayName: this.anonymizeName(index)
    }));
  }
};

// ===================================
// カレンダーコンポーネント
// ===================================
const Calendar = {
  // カレンダーをレンダリング
  render() {
    const grid = document.getElementById('calendarGrid');
    const monthYearDisplay = document.getElementById('calendarMonthYear');

    if (!grid || !monthYearDisplay) return;

    const year = AppState.currentDate.getFullYear();
    const month = AppState.currentDate.getMonth();

    // 月と年の表示を更新
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    monthYearDisplay.textContent = `${year}年 ${months[month]}`;

    // グリッドをクリア
    grid.innerHTML = '';

    // 曜日ヘッダー
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    weekdays.forEach(day => {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-weekday';
      dayEl.textContent = day;
      grid.appendChild(dayEl);
    });

    // 月の最初の日と最後の日
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 前月の日を埋める
    for (let i = 0; i < firstDay.getDay(); i++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day inactive';
      grid.appendChild(dayEl);
    }

    // 今月の日
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = Utils.formatDate(date);
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';

      // 日付番号
      const dayNumber = document.createElement('span');
      dayNumber.className = 'calendar-day-number';
      dayNumber.textContent = day;
      dayEl.appendChild(dayNumber);

      // 今日かどうか
      if (date.getTime() === today.getTime()) {
        dayEl.classList.add('today');
      }

      // 選択中かどうか
      if (AppState.selectedDate && dateStr === Utils.formatDate(AppState.selectedDate)) {
        dayEl.classList.add('selected');
      }

      // 予約可能期間外
      if (!Utils.isWithinBookingWindow(date, AppState.config?.settings?.reservationWindowDays || 40)) {
        dayEl.classList.add('disabled');
      } else if (DataManager.isOperatingDay(date)) {
        // 運行日
        const reservationsCount = DataManager.getReservationsForDate(date).length;
        const timeSlots = DataManager.getTimeSlotsForDate(date);
        if (reservationsCount >= timeSlots.length) {
          dayEl.classList.add('full');
        } else {
          dayEl.classList.add('available');
        }
      } else {
        // 運行日でない
        dayEl.classList.add('disabled');
      }

      // クリックイベント
      dayEl.addEventListener('click', () => {
        if (!dayEl.classList.contains('disabled') && !dayEl.classList.contains('inactive')) {
          this.selectDate(date);
        }
      });

      grid.appendChild(dayEl);
    }
  },

  // 日付を選択
  selectDate(date) {
    AppState.selectedDate = date;
    AppState.selectedTime = null;
    AppState.currentStep = 2;

    this.render();
    TimeSlots.render();
    UI.updateStepIndicator();
    UI.showTimeSlotSection();
  },

  // 前月へ
  prevMonth() {
    AppState.currentDate.setMonth(AppState.currentDate.getMonth() - 1);
    this.render();
  },

  // 次月へ
  nextMonth() {
    AppState.currentDate.setMonth(AppState.currentDate.getMonth() + 1);
    this.render();
  }
};

// ===================================
// 時間スロットコンポーネント
// ===================================
const TimeSlots = {
  render() {
    if (!AppState.selectedDate) return;

    const grid = document.getElementById('timeSlotsGrid');
    const dateDisplay = document.getElementById('selectedDateDisplay');

    if (!grid || !dateDisplay) return;

    // 選択日の表示
    dateDisplay.textContent = Utils.formatDateJP(AppState.selectedDate);

    // グリッドをクリア
    grid.innerHTML = '';

    // 時間スロットと予約情報を取得
    const timeSlots = DataManager.getTimeSlotsForDate(AppState.selectedDate);
    const anonymizedReservations = DataManager.getAnonymizedReservationsForDate(AppState.selectedDate);
    const capacity = DataManager.getTimeSlotCapacity();

    timeSlots.forEach(time => {
      const slotEl = document.createElement('div');
      slotEl.className = 'time-slot';

      // この時間帯の予約数と残り枠数を取得
      const remaining = DataManager.getTimeSlotRemainingSlots(AppState.selectedDate, time);
      const reservationsForTime = anonymizedReservations.filter(r => r.time === time);
      const bookedCount = reservationsForTime.length;

      // 満席かどうかチェック
      if (remaining <= 0) {
        slotEl.classList.add('booked');
        slotEl.classList.add('disabled');
        slotEl.innerHTML = `
          <span class="time-slot-time">${time}</span>
          <span class="time-slot-capacity">満席</span>
          <span class="time-slot-bookers">${reservationsForTime.map(r => r.displayName).join('、')}</span>
        `;
      } else {
        // 残り枠あり
        slotEl.innerHTML = `
          <span class="time-slot-time">${time}</span>
          <span class="time-slot-capacity ${remaining <= 2 ? 'few' : ''}">残り${remaining}枠</span>
          ${bookedCount > 0 ? `<span class="time-slot-bookers">${reservationsForTime.map(r => r.displayName).join('、')}</span>` : ''}
        `;
      }

      // 選択中かチェック
      if (AppState.selectedTime === time) {
        slotEl.classList.add('selected');
      }

      // クリックイベント
      slotEl.addEventListener('click', () => {
        if (!slotEl.classList.contains('disabled')) {
          this.selectTime(time);
        }
      });

      grid.appendChild(slotEl);
    });

    // 予約状況サマリーを表示
    this.renderReservationSummary(anonymizedReservations, timeSlots, capacity);
  },

  renderReservationSummary(reservations, timeSlots, capacity) {
    let summaryEl = document.getElementById('reservationSummarySection');

    // サマリー要素がなければ作成
    if (!summaryEl) {
      summaryEl = document.createElement('div');
      summaryEl.id = 'reservationSummarySection';
      summaryEl.className = 'reservation-status-summary mt-2';
      const timeSlotsGrid = document.getElementById('timeSlotsGrid');
      timeSlotsGrid.parentNode.insertBefore(summaryEl, timeSlotsGrid.nextSibling);
    }

    // 全体の統計を計算
    const totalCapacity = timeSlots.length * capacity;
    const bookedCount = reservations.length;
    const availableCount = totalCapacity - bookedCount;

    if (bookedCount === 0) {
      summaryEl.innerHTML = `
        <div class="status-summary-card available">
          <span class="status-icon">✅</span>
          <span>全ての時間帯で予約可能です（各${capacity}名 × ${timeSlots.length}便 = ${totalCapacity}名分）</span>
        </div>
      `;
    } else if (availableCount === 0) {
      summaryEl.innerHTML = `
        <div class="status-summary-card full">
          <span class="status-icon">🚫</span>
          <span>この日は満席です（${bookedCount}名予約済み）</span>
        </div>
        <div class="booked-list mt-1">
          <strong>予約一覧:</strong>
          ${reservations.map(r => `<span class="booked-item">${r.time} - ${r.displayName}</span>`).join('')}
        </div>
      `;
    } else {
      summaryEl.innerHTML = `
        <div class="status-summary-card partial">
          <span class="status-icon">📋</span>
          <span>予約可能: ${availableCount}名分 / 予約済み: ${bookedCount}名</span>
        </div>
        ${bookedCount > 0 ? `
        <div class="booked-list mt-1">
          <strong>予約一覧:</strong>
          ${reservations.map(r => `<span class="booked-item">${r.time} - ${r.displayName}</span>`).join('')}
        </div>
        ` : ''}
      `;
    }
  },

  selectTime(time) {
    AppState.selectedTime = time;
    AppState.currentStep = 3;

    this.render();
    UI.updateStepIndicator();
    UI.showReservationForm();
  }
};

// ===================================
// UI管理
// ===================================
const UI = {
  // ステップインジケーターを更新
  updateStepIndicator() {
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
      const stepNum = parseInt(step.dataset.step);
      step.classList.remove('active', 'completed');
      if (stepNum < AppState.currentStep) {
        step.classList.add('completed');
      } else if (stepNum === AppState.currentStep) {
        step.classList.add('active');
      }
    });
  },

  // 時間選択セクションを表示
  showTimeSlotSection() {
    document.getElementById('selectDatePrompt').classList.add('hidden');
    document.getElementById('timeSlotSection').classList.remove('hidden');
    document.getElementById('reservationForm').classList.add('hidden');
  },

  // 予約フォームを表示
  showReservationForm() {
    document.getElementById('reservationForm').classList.remove('hidden');
    this.renderLocationButtons();
  },

  // 乗車場所ボタンを生成
  renderLocationButtons() {
    const container = document.getElementById('locationButtons');
    const hiddenInput = document.getElementById('pickupLocation');
    if (!container) return;

    container.innerHTML = '';

    AppState.pickupLocations.forEach(location => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'location-btn';
      btn.textContent = location.name || location;
      btn.dataset.value = location.id || location.name || location;

      btn.addEventListener('click', () => {
        // 他のボタンの選択を解除
        container.querySelectorAll('.location-btn').forEach(b => b.classList.remove('selected'));
        // このボタンを選択
        btn.classList.add('selected');
        // hidden inputに値をセット
        hiddenInput.value = btn.dataset.value;
      });

      container.appendChild(btn);
    });
  },

  // マイ予約を表示
  renderMyReservations() {
    const container = document.getElementById('myReservationsList');
    if (!container) return;

    // このブラウザの予約IDリストを取得
    const myReservationIds = Utils.getFromStorage('grislo_my_reservations', []);

    // 有効な予約のみをフィルタリング
    const myReservations = AppState.reservations.filter(r =>
      myReservationIds.includes(r.id) && r.status !== 'cancelled'
    );

    if (myReservations.length === 0) {
      container.innerHTML = `
        <div class="no-reservations">
          <div class="no-reservations-icon">📭</div>
          <p>まだ予約がありません</p>
        </div>
      `;
      return;
    }

    // 日付順にソート（未来の予約を先に）
    myReservations.sort((a, b) => new Date(a.date) - new Date(b.date));

    container.innerHTML = myReservations.map(r => {
      const canCancel = Utils.canCancel(r.date);
      const locationObj = AppState.pickupLocations.find(l => l.id === r.pickupLocation || l.name === r.pickupLocation);
      const locationName = locationObj ? locationObj.name : r.pickupLocation;

      return `
        <div class="my-reservation-card">
          <div class="reservation-info">
            <div class="reservation-details">
              <div class="reservation-date">${Utils.formatDateJP(r.date)}</div>
              <div class="reservation-time">${r.time}</div>
              <div class="reservation-location">📍 ${locationName}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">予約番号: ${r.id}</div>
            </div>
            <div class="reservation-actions">
              ${canCancel ? `
                <button class="btn btn-sm btn-danger" onclick="App.cancelMyReservation('${r.id}')">
                  キャンセル
                </button>
              ` : `
                <span class="status-badge status-confirmed">当日</span>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // 確認モーダルを表示
  showConfirmModal(formData) {
    const summary = document.getElementById('reservationSummary');
    const locationObj = AppState.pickupLocations.find(l => l.id === formData.pickupLocation || l.name === formData.pickupLocation);
    const locationName = locationObj ? locationObj.name : formData.pickupLocation;

    summary.innerHTML = `
      <div class="summary-row">
        <span class="summary-label">日時</span>
        <span class="summary-value">${Utils.formatDateJP(AppState.selectedDate)} ${AppState.selectedTime}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">乗車場所</span>
        <span class="summary-value">${locationName}</span>
      </div>
      ${formData.name ? `
      <div class="summary-row">
        <span class="summary-label">お名前</span>
        <span class="summary-value">${formData.name}</span>
      </div>
      ` : ''}
      ${formData.notes ? `
      <div class="summary-row">
        <span class="summary-label">備考</span>
        <span class="summary-value">${formData.notes}</span>
      </div>
      ` : ''}
    `;

    document.getElementById('confirmModal').classList.add('active');
  },

  // 確認モーダルを閉じる
  hideConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
  },

  // 完了モーダルを表示
  showCompleteModal() {
    document.getElementById('completeModal').classList.add('active');
  },

  // 完了モーダルを閉じる
  hideCompleteModal() {
    document.getElementById('completeModal').classList.remove('active');
    // フォームをリセット
    this.resetForm();
  },

  // フォームをリセット
  resetForm() {
    AppState.selectedDate = null;
    AppState.selectedTime = null;
    AppState.currentStep = 1;

    document.getElementById('bookingForm').reset();
    document.getElementById('selectDatePrompt').classList.remove('hidden');
    document.getElementById('timeSlotSection').classList.add('hidden');
    document.getElementById('reservationForm').classList.add('hidden');

    // 場所ボタンの選択をクリア
    const locationBtns = document.querySelectorAll('.location-btn');
    locationBtns.forEach(btn => btn.classList.remove('selected'));
    document.getElementById('pickupLocation').value = '';

    Calendar.render();
    this.updateStepIndicator();
    this.renderMyReservations();
  },

  // 予約検索結果を表示
  showReservationResult(reservation) {
    const resultDiv = document.getElementById('reservationResult');
    const location = AppState.pickupLocations.find(l => l.id === reservation.pickupLocation);

    if (reservation.status === 'cancelled') {
      resultDiv.innerHTML = `
        <div class="alert alert-warning">
          <span class="alert-icon">⚠️</span>
          <div>この予約はキャンセル済みです。</div>
        </div>
      `;
    } else {
      const canCancel = Utils.canCancel(reservation.date);
      resultDiv.innerHTML = `
        <div class="reservation-summary mt-2">
          <div class="summary-row">
            <span class="summary-label">予約番号</span>
            <span class="summary-value">${reservation.id}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">日時</span>
            <span class="summary-value">${Utils.formatDateJP(reservation.date)} ${reservation.time}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">乗車場所</span>
            <span class="summary-value">${location ? location.name : reservation.pickupLocation}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">お名前</span>
            <span class="summary-value">${reservation.name}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">ステータス</span>
            <span class="summary-value"><span class="status-badge status-confirmed">確定</span></span>
          </div>
        </div>
        ${canCancel ? `
          <button class="btn btn-danger mt-2" id="cancelReservationBtn" data-id="${reservation.id}">
            予約をキャンセル
          </button>
        ` : `
          <div class="alert alert-info mt-2">
            <span class="alert-icon">ℹ️</span>
            <div>当日のため、キャンセルできません。</div>
          </div>
        `}
      `;

      // キャンセルボタンのイベント
      const cancelBtn = document.getElementById('cancelReservationBtn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          if (confirm('本当にこの予約をキャンセルしますか？')) {
            DataManager.cancelReservation(reservation.id);
            Toast.show('予約をキャンセルしました', 'success');
            resultDiv.innerHTML = `
              <div class="alert alert-success">
                <span class="alert-icon">✅</span>
                <div>予約をキャンセルしました。</div>
              </div>
            `;
            Calendar.render();
          }
        });
      }
    }

    resultDiv.classList.remove('hidden');
  },

  // 予約が見つからない場合
  showReservationNotFound() {
    const resultDiv = document.getElementById('reservationResult');
    resultDiv.innerHTML = `
      <div class="alert alert-error">
        <span class="alert-icon">❌</span>
        <div>予約が見つかりませんでした。予約番号をご確認ください。</div>
      </div>
    `;
    resultDiv.classList.remove('hidden');
  },

  // テーマを切り替え
  toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);

    const themeToggle = document.getElementById('themeToggle');
    themeToggle.textContent = newTheme === 'dark' ? '🌙' : '☀️';

    localStorage.setItem('grislo_theme', newTheme);
  },

  // 保存されたテーマを読み込み
  loadTheme() {
    const savedTheme = localStorage.getItem('grislo_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    }
  }
};

// ===================================
// トースト通知
// ===================================
const Toast = {
  show(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    toast.innerHTML = `
      <span class="alert-icon">${icons[type] || icons.info}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // 3秒後に削除
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// ===================================
// イベントハンドラー
// ===================================
function setupEventHandlers() {
  // カレンダーナビゲーション
  document.getElementById('prevMonth')?.addEventListener('click', () => Calendar.prevMonth());
  document.getElementById('nextMonth')?.addEventListener('click', () => Calendar.nextMonth());

  // テーマ切り替え
  document.getElementById('themeToggle')?.addEventListener('click', () => UI.toggleTheme());

  // 予約フォーム送信
  document.getElementById('bookingForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const pickupLocation = document.getElementById('pickupLocation').value;
    if (!pickupLocation) {
      Toast.show('乗車場所を選択してください', 'warning');
      return;
    }

    const formData = {
      name: document.getElementById('customerName').value.trim(),
      pickupLocation: pickupLocation,
      notes: document.getElementById('notes').value.trim()
    };

    AppState.currentStep = 4;
    UI.updateStepIndicator();
    UI.showConfirmModal(formData);
  });

  // モーダル閉じる
  document.getElementById('closeModal')?.addEventListener('click', () => {
    AppState.currentStep = 3;
    UI.updateStepIndicator();
    UI.hideConfirmModal();
  });
  document.getElementById('cancelConfirm')?.addEventListener('click', () => {
    AppState.currentStep = 3;
    UI.updateStepIndicator();
    UI.hideConfirmModal();
  });

  // 予約確定
  document.getElementById('submitReservation')?.addEventListener('click', () => {
    const reservationId = Utils.generateReservationId();
    const nameInput = document.getElementById('customerName').value.trim();

    // 名前が空の場合は、既存の予約数に基づいてAさん、Bさん形式で生成
    const dateReservations = DataManager.getReservationsForDate(AppState.selectedDate);
    const autoName = DataManager.anonymizeName(dateReservations.length);

    const formData = {
      id: reservationId,
      name: nameInput || autoName,
      displayName: autoName,
      date: Utils.formatDate(AppState.selectedDate),
      time: AppState.selectedTime,
      pickupLocation: document.getElementById('pickupLocation').value,
      notes: document.getElementById('notes').value.trim(),
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    DataManager.saveReservation(formData);

    // マイ予約リストに保存
    const myReservationIds = Utils.getFromStorage('grislo_my_reservations', []);
    myReservationIds.push(reservationId);
    Utils.saveToStorage('grislo_my_reservations', myReservationIds);

    UI.hideConfirmModal();
    UI.showCompleteModal(formData.id);

    // 予約完了後にUIを更新
    UI.renderMyReservations();
    Calendar.render();
    UI.updateStepIndicator();

    Toast.show('予約が完了しました！', 'success');
  });

  // 完了モーダル閉じる
  document.getElementById('closeCompleteModal')?.addEventListener('click', () => UI.hideCompleteModal());
  document.getElementById('closeComplete')?.addEventListener('click', () => UI.hideCompleteModal());

  // 予約確認フォーム
  document.getElementById('checkReservationForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const reservationId = document.getElementById('reservationId').value.trim();

    if (!reservationId) {
      Toast.show('予約番号を入力してください', 'warning');
      return;
    }

    const reservation = DataManager.findReservation(reservationId);
    if (reservation) {
      UI.showReservationResult(reservation);
    } else {
      UI.showReservationNotFound();
    }
  });

  // モーダル外クリックで閉じる
  document.getElementById('confirmModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'confirmModal') {
      AppState.currentStep = 3;
      UI.updateStepIndicator();
      UI.hideConfirmModal();
    }
  });
  document.getElementById('completeModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'completeModal') {
      UI.hideCompleteModal();
    }
  });
}

// ===================================
// アプリケーション初期化
// ===================================
async function initApp() {
  // テーマを読み込み
  UI.loadTheme();

  // データを読み込み
  await DataManager.loadConfig();
  await DataManager.loadSchedule();
  await DataManager.loadPickupLocations();
  await DataManager.loadReservations();

  // UIを初期化
  Calendar.render();
  UI.updateStepIndicator();
  UI.renderMyReservations();

  // イベントハンドラーを設定
  setupEventHandlers();

  console.log('グリスロ予約システムを初期化しました');
}

// ===================================
// グローバルアプリオブジェクト（HTMLから呼び出し用）
// ===================================
const App = {
  // マイ予約からキャンセル
  async cancelMyReservation(reservationId) {
    if (confirm('この予約をキャンセルしますか？')) {
      const result = await DataManager.cancelReservation(reservationId);
      if (result) {
        Toast.show('予約をキャンセルしました', 'success');
        UI.renderMyReservations();
        Calendar.render();
      } else {
        Toast.show('キャンセルに失敗しました', 'error');
      }
    }
  }
};

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', initApp);
