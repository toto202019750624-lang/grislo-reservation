/**
 * グリスロ予約システム - 管理者ダッシュボード
 */

// ===================================
// グローバル状態
// ===================================
const AdminState = {
    isLoggedIn: false,
    config: null,
    schedule: [],
    reservations: [],
    pickupLocations: [],
    currentSection: 'overview'
};

// ===================================
// ユーティリティ
// ===================================
const Utils = {
    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    formatDateJP(date) {
        const d = new Date(date);
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
    },

    getFromStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Storage read error:', e);
            return defaultValue;
        }
    },

    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage write error:', e);
            return false;
        }
    },

    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// ===================================
// データ管理
// ===================================
const DataManager = {
    async loadConfig() {
        try {
            const response = await fetch('data/config.json');
            AdminState.config = await response.json();
            return AdminState.config;
        } catch (e) {
            console.error('Config load error:', e);
            AdminState.config = {
                settings: {
                    serviceName: "町のグリスロ予約",
                    vehicleCapacity: 6,
                    maxPassengersPerReservation: 1,
                    reservationWindowDays: 40,
                    cancelDeadlineHours: 24,
                    timeSlots: ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"],
                    adminPassword: "admin123"
                }
            };
            return AdminState.config;
        }
    },

    loadSchedule() {
        AdminState.schedule = Utils.getFromStorage('grislo_schedule', []);
        return AdminState.schedule;
    },

    saveSchedule() {
        Utils.saveToStorage('grislo_schedule', AdminState.schedule);
    },

    addScheduleDay(date, timeSlots) {
        const existing = AdminState.schedule.findIndex(s => s.date === date);
        if (existing !== -1) {
            AdminState.schedule[existing] = { date, timeSlots, available: true };
        } else {
            AdminState.schedule.push({ date, timeSlots, available: true });
        }
        // 日付順にソート
        AdminState.schedule.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.saveSchedule();
    },

    removeScheduleDay(date) {
        AdminState.schedule = AdminState.schedule.filter(s => s.date !== date);
        this.saveSchedule();
    },

    loadPickupLocations() {
        AdminState.pickupLocations = Utils.getFromStorage('grislo_locations', []);
        return AdminState.pickupLocations;
    },

    async loadDefaultPickupLocations() {
        try {
            const response = await fetch('data/pickupLocations.json');
            const data = await response.json();
            if (!AdminState.pickupLocations.length) {
                AdminState.pickupLocations = data.locations || [];
                this.savePickupLocations();
            }
        } catch (e) {
            console.error('Pickup locations load error:', e);
        }
    },

    savePickupLocations() {
        Utils.saveToStorage('grislo_locations', AdminState.pickupLocations);
    },

    addPickupLocation(name, address = '') {
        const id = Utils.generateId('loc');
        AdminState.pickupLocations.push({ id, name, address });
        this.savePickupLocations();
        return { id, name, address };
    },

    removePickupLocation(id) {
        AdminState.pickupLocations = AdminState.pickupLocations.filter(l => l.id !== id);
        this.savePickupLocations();
    },

    loadReservations() {
        AdminState.reservations = Utils.getFromStorage('grislo_reservations', []);
        return AdminState.reservations;
    },

    cancelReservation(reservationId) {
        const index = AdminState.reservations.findIndex(r => r.id === reservationId);
        if (index !== -1) {
            AdminState.reservations[index].status = 'cancelled';
            Utils.saveToStorage('grislo_reservations', AdminState.reservations);
            return true;
        }
        return false;
    },

    getStats() {
        const today = Utils.formatDate(new Date());
        const todayReservations = AdminState.reservations.filter(
            r => r.date === today && r.status !== 'cancelled'
        ).length;
        const totalReservations = AdminState.reservations.filter(
            r => r.status !== 'cancelled'
        ).length;
        const upcomingDays = AdminState.schedule.filter(
            s => new Date(s.date) >= new Date(today) && s.available
        ).length;
        const cancelled = AdminState.reservations.filter(
            r => r.status === 'cancelled'
        ).length;

        return { todayReservations, totalReservations, upcomingDays, cancelled };
    },

    getUpcomingReservations(limit = 10) {
        const today = Utils.formatDate(new Date());
        return AdminState.reservations
            .filter(r => r.date >= today && r.status !== 'cancelled')
            .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
            .slice(0, limit);
    },

    getLocationName(locationId) {
        const location = AdminState.pickupLocations.find(l => l.id === locationId);
        return location ? location.name : locationId;
    }
};

// ===================================
// 認証
// ===================================
const Auth = {
    login(password) {
        const adminPassword = AdminState.config?.settings?.adminPassword || 'admin123';
        // ローカルで変更されたパスワードをチェック
        const customPassword = Utils.getFromStorage('grislo_admin_password', null);
        const correctPassword = customPassword || adminPassword;

        if (password === correctPassword) {
            AdminState.isLoggedIn = true;
            sessionStorage.setItem('grislo_admin_logged_in', 'true');
            return true;
        }
        return false;
    },

    logout() {
        AdminState.isLoggedIn = false;
        sessionStorage.removeItem('grislo_admin_logged_in');
    },

    checkSession() {
        return sessionStorage.getItem('grislo_admin_logged_in') === 'true';
    },

    changePassword(newPassword) {
        Utils.saveToStorage('grislo_admin_password', newPassword);
        Toast.show('パスワードを変更しました', 'success');
    }
};

// ===================================
// UI管理
// ===================================
const AdminUI = {
    showDashboard() {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        document.getElementById('adminUserName').textContent = '管理者';
    },

    showLoginForm() {
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('adminDashboard').classList.add('hidden');
        document.getElementById('logoutBtn').classList.add('hidden');
        document.getElementById('adminUserName').textContent = '';
    },

    switchSection(sectionName) {
        AdminState.currentSection = sectionName;

        // ナビゲーション更新
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionName);
        });

        // セクション表示切替
        document.querySelectorAll('[id$="Section"]').forEach(section => {
            if (section.id !== 'loginSection') {
                section.classList.add('hidden');
            }
        });
        document.getElementById(`${sectionName}Section`)?.classList.remove('hidden');

        // データ更新
        this.refreshSection(sectionName);
    },

    refreshSection(sectionName) {
        switch (sectionName) {
            case 'overview':
                this.renderStats();
                this.renderUpcomingReservations();
                break;
            case 'reservations':
                this.renderAllReservations();
                break;
            case 'schedule':
                this.renderTimeCheckboxes();
                this.renderScheduleList();
                break;
            case 'locations':
                this.renderLocationsList();
                break;
            case 'settings':
                this.renderSettings();
                break;
        }
    },

    renderStats() {
        const stats = DataManager.getStats();
        document.getElementById('statTodayReservations').textContent = stats.todayReservations;
        document.getElementById('statTotalReservations').textContent = stats.totalReservations;
        document.getElementById('statUpcomingDays').textContent = stats.upcomingDays;
        document.getElementById('statCancelled').textContent = stats.cancelled;
    },

    renderUpcomingReservations() {
        const tbody = document.querySelector('#upcomingReservationsTable tbody');
        const reservations = DataManager.getUpcomingReservations();

        if (reservations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">今後の予約はありません</td></tr>';
            return;
        }

        tbody.innerHTML = reservations.map(r => `
      <tr>
        <td>${Utils.formatDateJP(r.date)} ${r.time}</td>
        <td>${r.name}</td>
        <td>${DataManager.getLocationName(r.pickupLocation)}</td>
        <td><span class="status-badge status-confirmed">確定</span></td>
      </tr>
    `).join('');
    },

    renderAllReservations() {
        const tbody = document.querySelector('#allReservationsTable tbody');
        const filterDate = document.getElementById('filterDate').value;
        const filterStatus = document.getElementById('filterStatus').value;

        let reservations = [...AdminState.reservations];

        // フィルタリング
        if (filterDate) {
            reservations = reservations.filter(r => r.date === filterDate);
        }
        if (filterStatus) {
            reservations = reservations.filter(r => r.status === filterStatus);
        }

        // 日付降順でソート
        reservations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (reservations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">予約がありません</td></tr>';
            return;
        }

        tbody.innerHTML = reservations.map(r => `
      <tr>
        <td><code style="font-size: 0.75rem;">${r.id}</code></td>
        <td>${Utils.formatDateJP(r.date)} ${r.time}</td>
        <td>${r.name}</td>
        <td>${DataManager.getLocationName(r.pickupLocation)}</td>
        <td>${r.contactMethod === 'email' ? 'メール' : r.contactMethod === 'line' ? 'LINE' : '-'}</td>
        <td>
          <span class="status-badge ${r.status === 'cancelled' ? 'status-cancelled' : 'status-confirmed'}">
            ${r.status === 'cancelled' ? 'キャンセル' : '確定'}
          </span>
        </td>
        <td>
          ${r.status !== 'cancelled' ? `
            <button class="btn btn-sm btn-danger cancel-reservation-btn" data-id="${r.id}">
              キャンセル
            </button>
          ` : '-'}
        </td>
      </tr>
    `).join('');

        // キャンセルボタンのイベント設定
        document.querySelectorAll('.cancel-reservation-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                if (confirm('この予約をキャンセルしますか？')) {
                    DataManager.cancelReservation(id);
                    Toast.show('予約をキャンセルしました', 'success');
                    this.renderAllReservations();
                    this.renderStats();
                }
            });
        });
    },

    renderTimeCheckboxes() {
        const container = document.getElementById('timeCheckboxes');
        // デフォルト時間帯
        const defaultSlots = AdminState.config?.settings?.timeSlots ||
            ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
        // カスタム追加された時間帯
        const customSlots = AdminState.customTimeSlots || [];
        // 全ての時間帯を結合してソート
        const allSlots = [...new Set([...defaultSlots, ...customSlots])].sort();

        container.innerHTML = allSlots.map(time => {
            const isCustom = customSlots.includes(time);
            return `
      <label class="time-checkbox ${isCustom ? 'custom-time' : ''}">
        <input type="checkbox" name="timeSlot" value="${time}" checked>
        ${time}
        ${isCustom ? `<button type="button" class="remove-time-btn" data-time="${time}" title="削除">✕</button>` : ''}
      </label>
    `;
        }).join('');

        // カスタム時間削除ボタンのイベント
        document.querySelectorAll('.remove-time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const time = btn.dataset.time;
                AdminState.customTimeSlots = AdminState.customTimeSlots.filter(t => t !== time);
                this.renderTimeCheckboxes();
                Toast.show(`${time} を削除しました`, 'info');
            });
        });
    },

    addCustomTime(time) {
        if (!time) {
            Toast.show('時間を入力してください', 'warning');
            return false;
        }
        // 初期化
        if (!AdminState.customTimeSlots) {
            AdminState.customTimeSlots = [];
        }
        // 既存チェック
        const defaultSlots = AdminState.config?.settings?.timeSlots ||
            ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
        if (defaultSlots.includes(time) || AdminState.customTimeSlots.includes(time)) {
            Toast.show('この時間は既に存在します', 'warning');
            return false;
        }
        // 追加
        AdminState.customTimeSlots.push(time);
        AdminState.customTimeSlots.sort();
        this.renderTimeCheckboxes();
        Toast.show(`${time} を追加しました`, 'success');
        return true;
    },

    renderScheduleList() {
        const container = document.getElementById('scheduleList');
        const today = Utils.formatDate(new Date());

        // 今日以降の日程のみ表示
        const futureSchedule = AdminState.schedule.filter(s => s.date >= today);

        if (futureSchedule.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-secondary);">運行日程が登録されていません</p>';
            return;
        }

        container.innerHTML = futureSchedule.map(s => `
      <div class="schedule-item">
        <div>
          <div class="schedule-date">${Utils.formatDateJP(s.date)}</div>
          <div class="schedule-times">${s.timeSlots.join(', ')}</div>
        </div>
        <button class="btn btn-sm btn-danger delete-schedule-btn" data-date="${s.date}">
          削除
        </button>
      </div>
    `).join('');

        // 削除ボタンのイベント
        document.querySelectorAll('.delete-schedule-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const date = btn.dataset.date;
                if (confirm('この運行日程を削除しますか？')) {
                    DataManager.removeScheduleDay(date);
                    Toast.show('運行日程を削除しました', 'success');
                    this.renderScheduleList();
                    this.renderStats();
                }
            });
        });
    },

    renderLocationsList() {
        const container = document.getElementById('locationsList');

        if (AdminState.pickupLocations.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-secondary);">乗車場所が登録されていません</p>';
            return;
        }

        container.innerHTML = AdminState.pickupLocations.map(loc => `
      <div class="schedule-item">
        <div>
          <div class="schedule-date">${loc.name}</div>
          ${loc.address ? `<div class="schedule-times">${loc.address}</div>` : ''}
        </div>
        <button class="btn btn-sm btn-danger delete-location-btn" data-id="${loc.id}">
          削除
        </button>
      </div>
    `).join('');

        // 削除ボタンのイベント
        document.querySelectorAll('.delete-location-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                if (confirm('この乗車場所を削除しますか？')) {
                    DataManager.removePickupLocation(id);
                    Toast.show('乗車場所を削除しました', 'success');
                    this.renderLocationsList();
                }
            });
        });
    },

    renderSettings() {
        const container = document.getElementById('currentSettings');
        const settings = AdminState.config?.settings || {};

        container.innerHTML = `
      <div class="summary-row">
        <span class="summary-label">サービス名</span>
        <span class="summary-value">${settings.serviceName || '-'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">車両定員</span>
        <span class="summary-value">${settings.vehicleCapacity || '-'}名</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">予約可能期間</span>
        <span class="summary-value">${settings.reservationWindowDays || '-'}日前まで</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">キャンセル期限</span>
        <span class="summary-value">前日まで</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">運行時間帯</span>
        <span class="summary-value">${(settings.timeSlots || []).join(', ')}</span>
      </div>
    `;
    },

    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);

        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = newTheme === 'dark' ? '🌙' : '☀️';

        localStorage.setItem('grislo_theme', newTheme);
    },

    loadTheme() {
        const savedTheme = localStorage.getItem('grislo_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
        }
    },

    exportToCsv() {
        const reservations = AdminState.reservations;
        if (reservations.length === 0) {
            Toast.show('エクスポートする予約がありません', 'warning');
            return;
        }

        const headers = ['予約番号', '日付', '時間', '名前', '乗車場所', '連絡方法', '連絡先', 'ステータス', '作成日時'];
        const rows = reservations.map(r => [
            r.id,
            r.date,
            r.time,
            r.name,
            DataManager.getLocationName(r.pickupLocation),
            r.contactMethod,
            r.contactInfo || '',
            r.status,
            r.createdAt
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reservations_${Utils.formatDate(new Date())}.csv`;
        link.click();

        Toast.show('CSVをエクスポートしました', 'success');
    },

    exportAllData() {
        const data = {
            reservations: AdminState.reservations,
            schedule: AdminState.schedule,
            locations: AdminState.pickupLocations,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `grislo_backup_${Utils.formatDate(new Date())}.json`;
        link.click();

        Toast.show('データをエクスポートしました', 'success');
    },

    clearAllData() {
        if (confirm('本当にすべてのデータを削除しますか？この操作は取り消せません。')) {
            localStorage.removeItem('grislo_reservations');
            localStorage.removeItem('grislo_schedule');
            localStorage.removeItem('grislo_locations');

            AdminState.reservations = [];
            AdminState.schedule = [];
            AdminState.pickupLocations = [];

            Toast.show('データをクリアしました', 'success');
            this.switchSection('overview');
        }
    }
};

// ===================================
// イベントハンドラー
// ===================================
function setupEventHandlers() {
    // ログインフォーム
    document.getElementById('loginForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;

        if (Auth.login(password)) {
            Toast.show('ログインしました', 'success');
            AdminUI.showDashboard();
            AdminUI.switchSection('overview');
        } else {
            Toast.show('パスワードが正しくありません', 'error');
        }
    });

    // ログアウト
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        Auth.logout();
        AdminUI.showLoginForm();
        Toast.show('ログアウトしました', 'info');
    });

    // テーマ切り替え
    document.getElementById('themeToggle')?.addEventListener('click', () => AdminUI.toggleTheme());

    // ナビゲーション
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            AdminUI.switchSection(item.dataset.section);
        });
    });

    // フィルター
    document.getElementById('filterDate')?.addEventListener('change', () => AdminUI.renderAllReservations());
    document.getElementById('filterStatus')?.addEventListener('change', () => AdminUI.renderAllReservations());

    // CSVエクスポート
    document.getElementById('exportCsv')?.addEventListener('click', () => AdminUI.exportToCsv());

    // カスタム時間追加
    document.getElementById('addCustomTime')?.addEventListener('click', () => {
        const input = document.getElementById('customTimeInput');
        if (AdminUI.addCustomTime(input.value)) {
            input.value = '';
        }
    });

    // 全選択
    document.getElementById('selectAllTimes')?.addEventListener('click', () => {
        document.querySelectorAll('input[name="timeSlot"]').forEach(cb => cb.checked = true);
    });

    // 全解除
    document.getElementById('deselectAllTimes')?.addEventListener('click', () => {
        document.querySelectorAll('input[name="timeSlot"]').forEach(cb => cb.checked = false);
    });

    // 運行日程追加
    document.getElementById('addScheduleForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = document.getElementById('scheduleDate').value;
        const checkboxes = document.querySelectorAll('input[name="timeSlot"]:checked');
        const timeSlots = Array.from(checkboxes).map(cb => cb.value);

        if (!date) {
            Toast.show('日付を選択してください', 'warning');
            return;
        }
        if (timeSlots.length === 0) {
            Toast.show('時間帯を1つ以上選択してください', 'warning');
            return;
        }

        DataManager.addScheduleDay(date, timeSlots);
        Toast.show('運行日程を追加しました', 'success');
        AdminUI.renderScheduleList();
        AdminUI.renderStats();

        // フォームリセット
        document.getElementById('scheduleDate').value = '';
        AdminUI.renderTimeCheckboxes();
    });

    // 乗車場所追加
    document.getElementById('addLocationForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('locationName').value.trim();
        const address = document.getElementById('locationAddress').value.trim();

        if (!name) {
            Toast.show('場所名を入力してください', 'warning');
            return;
        }

        DataManager.addPickupLocation(name, address);
        Toast.show('乗車場所を追加しました', 'success');
        AdminUI.renderLocationsList();

        // フォームリセット
        document.getElementById('locationName').value = '';
        document.getElementById('locationAddress').value = '';
    });

    // パスワード変更
    document.getElementById('changePasswordForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            Toast.show('パスワードが一致しません', 'error');
            return;
        }
        if (newPassword.length < 4) {
            Toast.show('パスワードは4文字以上にしてください', 'warning');
            return;
        }

        Auth.changePassword(newPassword);
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    });

    // データ管理
    document.getElementById('exportData')?.addEventListener('click', () => AdminUI.exportAllData());
    document.getElementById('clearData')?.addEventListener('click', () => AdminUI.clearAllData());
}

// ===================================
// 初期化
// ===================================
async function initAdmin() {
    // テーマ読み込み
    AdminUI.loadTheme();

    // データ読み込み
    await DataManager.loadConfig();
    DataManager.loadSchedule();
    DataManager.loadReservations();
    DataManager.loadPickupLocations();
    await DataManager.loadDefaultPickupLocations();

    // セッションチェック
    if (Auth.checkSession()) {
        AdminState.isLoggedIn = true;
        AdminUI.showDashboard();
        AdminUI.switchSection('overview');
    } else {
        AdminUI.showLoginForm();
    }

    // イベントハンドラー設定
    setupEventHandlers();

    console.log('管理者ダッシュボードを初期化しました');
}

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', initAdmin);
