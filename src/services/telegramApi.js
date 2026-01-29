import { supabase } from '../config/supabase';

// Telegram bot username (without @)
export const TELEGRAM_BOT_USERNAME = 'CasheAppBot';

// ============================================
// HELPER: Get current user ID
// ============================================
const getUserId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    throw new Error('Error getting authenticated user');
  }
  if (!user) {
    throw new Error('No authenticated user');
  }
  return user.id;
};

// ============================================
// GET TELEGRAM STATUS
// Check if the user has linked their Telegram
// ============================================
export const getTelegramStatus = async () => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error getting Telegram status:', error);
    throw error;
  }

  if (!data) {
    return {
      status: 'not_linked',
      telegramId: null,
      telegramUsername: null,
      telegramFirstName: null,
      verificationCode: null,
      linkedAt: null
    };
  }

  if (data.verified) {
    return {
      status: 'linked',
      telegramId: data.telegram_id,
      telegramUsername: data.telegram_username,
      telegramFirstName: data.telegram_first_name,
      verificationCode: null,
      linkedAt: data.updated_at
    };
  }

  // Has record but not verified - check if code is still valid
  const codeExpired = data.verification_expires_at &&
    new Date(data.verification_expires_at) < new Date();

  return {
    status: codeExpired ? 'code_expired' : 'pending_verification',
    telegramId: null,
    telegramUsername: null,
    telegramFirstName: null,
    verificationCode: codeExpired ? null : data.verification_code,
    expiresAt: data.verification_expires_at,
    linkedAt: null
  };
};

// ============================================
// GENERATE VERIFICATION CODE
// Creates a 6-digit code that expires in 10 minutes
// ============================================
export const generateTelegramVerificationCode = async () => {
  const userId = await getUserId();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  const { data, error } = await supabase
    .from('telegram_users')
    .upsert({
      user_id: userId,
      telegram_id: null, // Will be set when verified
      verification_code: code,
      verification_expires_at: expiresAt,
      verified: false,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error generating verification code:', error);
    throw error;
  }

  return {
    code,
    expiresAt,
    expiresIn: 600 // 10 minutes in seconds
  };
};

// ============================================
// CHECK TELEGRAM VERIFICATION
// Poll to see if the user has verified via Telegram
// ============================================
export const checkTelegramVerification = async () => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('telegram_users')
    .select('verified, telegram_id, telegram_username, telegram_first_name, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking verification:', error);
    return { verified: false, telegramUsername: null };
  }

  if (!data) {
    return { verified: false, telegramUsername: null };
  }

  return {
    verified: data.verified === true,
    telegramId: data.verified ? data.telegram_id : null,
    telegramUsername: data.verified ? data.telegram_username : null,
    telegramFirstName: data.verified ? data.telegram_first_name : null,
    linkedAt: data.verified ? data.updated_at : null
  };
};

// ============================================
// UNLINK TELEGRAM
// Remove the Telegram link for the user
// ============================================
export const unlinkTelegram = async () => {
  const userId = await getUserId();

  const { error } = await supabase
    .from('telegram_users')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error unlinking Telegram:', error);
    throw error;
  }

  return { success: true };
};

// ============================================
// GET PENDING TELEGRAM ACTIONS
// Get actions waiting for confirmation (for potential UI display)
// ============================================
export const getPendingTelegramActions = async () => {
  const userId = await getUserId();

  // First get the telegram_user_id for this user
  const { data: telegramUser, error: userError } = await supabase
    .from('telegram_users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (userError || !telegramUser) {
    return { actions: [] };
  }

  const { data, error } = await supabase
    .from('telegram_pending_actions')
    .select('*')
    .eq('telegram_user_id', telegramUser.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting pending actions:', error);
    return { actions: [] };
  }

  return { actions: data || [] };
};

// ============================================
// FORMAT TELEGRAM USERNAME FOR DISPLAY
// Formats username with @
// ============================================
export const formatTelegramUsername = (username) => {
  if (!username) return null;
  return username.startsWith('@') ? username : `@${username}`;
};

// ============================================
// GET TELEGRAM DEEP LINK
// Returns the deep link to start the bot with verification code
// https://t.me/ works on web, mobile, and desktop
// ============================================
export const getTelegramDeepLink = (code) => {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`;
};
