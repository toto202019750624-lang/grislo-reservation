/**
 * Supabase クライアント設定
 * グリスロ予約システム
 */

// Supabase設定
const SUPABASE_URL = 'https://ycabpfxbzyypljgjflxi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYWJwZnhienl5cGxqZ2pmbHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczODEwOTIsImV4cCI6MjA4Mjk1NzA5Mn0.DcGEiab9FrrWfAE7cYHDaSCkbVZ0GqR7baUpicql7D8';

// Supabase クライアントを初期化
let supabaseClient = null;

// Supabase が利用可能かチェック
function isSupabaseAvailable() {
    // CDN v2では window.supabase.createClient として公開される
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
        return true;
    }
    return false;
}

// Supabase クライアントを取得
function getSupabaseClient() {
    if (!supabaseClient && isSupabaseAvailable()) {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase client initialized successfully');
        } catch (e) {
            console.error('Supabase client initialization error:', e);
            return null;
        }
    }
    return supabaseClient;
}

// ===================================
// Supabase データ操作
// ===================================
const SupabaseDB = {
    // ================================
    // スケジュール関連
    // ================================

    // 全スケジュールを取得
    async getSchedule() {
        const client = getSupabaseClient();
        if (!client) return null;

        const { data, error } = await client
            .from('schedule')
            .select('*')
            .eq('available', true)
            .order('date', { ascending: true });

        if (error) {
            console.error('Schedule fetch error:', error);
            return null;
        }

        // app.js の形式に変換
        return data.map(row => ({
            date: row.date,
            timeSlots: row.time_slots,
            available: row.available
        }));
    },

    // スケジュールを追加・更新
    async upsertSchedule(date, timeSlots) {
        const client = getSupabaseClient();
        if (!client) return false;

        const { error } = await client
            .from('schedule')
            .upsert({
                date: date,
                time_slots: timeSlots,
                available: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'date' });

        if (error) {
            console.error('Schedule upsert error:', error);
            return false;
        }
        return true;
    },

    // スケジュールを削除
    async deleteSchedule(date) {
        const client = getSupabaseClient();
        if (!client) return false;

        const { error } = await client
            .from('schedule')
            .delete()
            .eq('date', date);

        if (error) {
            console.error('Schedule delete error:', error);
            return false;
        }
        return true;
    },

    // ================================
    // 予約関連
    // ================================

    // 全予約を取得
    async getReservations() {
        const client = getSupabaseClient();
        if (!client) return null;

        const { data, error } = await client
            .from('reservations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Reservations fetch error:', error);
            return null;
        }

        // app.js の形式に変換
        return data.map(row => ({
            id: row.id,
            name: row.name,
            displayName: row.display_name,
            date: row.date,
            time: row.time,
            pickupLocation: row.pickup_location,
            notes: row.notes,
            status: row.status,
            createdAt: row.created_at
        }));
    },

    // 予約を追加
    async addReservation(reservation) {
        const client = getSupabaseClient();
        if (!client) return false;

        const { error } = await client
            .from('reservations')
            .insert({
                id: reservation.id,
                name: reservation.name,
                display_name: reservation.displayName,
                date: reservation.date,
                time: reservation.time,
                pickup_location: reservation.pickupLocation,
                notes: reservation.notes,
                status: reservation.status || 'confirmed'
            });

        if (error) {
            console.error('Reservation insert error:', error);
            return false;
        }
        return true;
    },

    // 予約をキャンセル（ステータス更新）
    async cancelReservation(reservationId) {
        const client = getSupabaseClient();
        if (!client) return false;

        const { error } = await client
            .from('reservations')
            .update({ status: 'cancelled' })
            .eq('id', reservationId);

        if (error) {
            console.error('Reservation cancel error:', error);
            return false;
        }
        return true;
    },

    // ================================
    // 乗車場所関連
    // ================================

    // 全乗車場所を取得
    async getPickupLocations() {
        const client = getSupabaseClient();
        if (!client) return null;

        const { data, error } = await client
            .from('pickup_locations')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Pickup locations fetch error:', error);
            return null;
        }

        return data.map(row => ({
            id: row.id,
            name: row.name,
            address: row.address
        }));
    },

    // 乗車場所を追加
    async addPickupLocation(id, name, address = '') {
        const client = getSupabaseClient();
        if (!client) return false;

        const { error } = await client
            .from('pickup_locations')
            .insert({ id, name, address });

        if (error) {
            console.error('Pickup location insert error:', error);
            return false;
        }
        return true;
    },

    // 乗車場所を削除
    async deletePickupLocation(id) {
        const client = getSupabaseClient();
        if (!client) return false;

        const { error } = await client
            .from('pickup_locations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Pickup location delete error:', error);
            return false;
        }
        return true;
    }
};
