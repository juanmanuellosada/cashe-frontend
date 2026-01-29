import { supabase } from '../config/supabase';

// WhatsApp bot phone number (without +)
export const WHATSAPP_BOT_NUMBER = '15551632329'; // Meta test number

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
// CHECK IF USER HAS WHATSAPP ACCESS
// Returns whether the user can use WhatsApp integration
// ============================================
export const checkWhatsAppAccess = async () => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('profiles')
    .select('whatsapp_enabled, email, full_name')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error checking WhatsApp access:', error);
    return { enabled: false, email: null, name: null };
  }

  return {
    enabled: data?.whatsapp_enabled === true,
    email: data?.email,
    name: data?.full_name
  };
};

// ============================================
// GET WHATSAPP STATUS
// Check if the user has linked their WhatsApp
// ============================================
export const getWhatsAppStatus = async () => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('whatsapp_users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error getting WhatsApp status:', error);
    throw error;
  }

  if (!data) {
    return {
      status: 'not_linked',
      phone: null,
      verificationCode: null,
      linkedAt: null
    };
  }

  if (data.verified) {
    return {
      status: 'linked',
      phone: data.phone_number,
      verificationCode: null,
      linkedAt: data.updated_at
    };
  }

  // Has record but not verified - check if code is still valid
  const codeExpired = data.verification_expires_at &&
    new Date(data.verification_expires_at) < new Date();

  return {
    status: codeExpired ? 'code_expired' : 'pending_verification',
    phone: null,
    verificationCode: codeExpired ? null : data.verification_code,
    expiresAt: data.verification_expires_at,
    linkedAt: null
  };
};

// ============================================
// GENERATE VERIFICATION CODE
// Creates a 6-digit code that expires in 10 minutes
// ============================================
export const generateVerificationCode = async () => {
  const userId = await getUserId();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  const { data, error } = await supabase
    .from('whatsapp_users')
    .upsert({
      user_id: userId,
      phone_number: `pending_${userId}`, // Placeholder until verified
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
// CHECK WHATSAPP VERIFICATION
// Poll to see if the user has verified via WhatsApp
// ============================================
export const checkWhatsAppVerification = async () => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('whatsapp_users')
    .select('verified, phone_number, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking verification:', error);
    return { verified: false, phone: null };
  }

  if (!data) {
    return { verified: false, phone: null };
  }

  return {
    verified: data.verified === true,
    phone: data.verified ? data.phone_number : null,
    linkedAt: data.verified ? data.updated_at : null
  };
};

// ============================================
// UNLINK WHATSAPP
// Remove the WhatsApp link for the user
// ============================================
export const unlinkWhatsApp = async () => {
  const userId = await getUserId();

  const { error } = await supabase
    .from('whatsapp_users')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error unlinking WhatsApp:', error);
    throw error;
  }

  return { success: true };
};

// ============================================
// GET PENDING WHATSAPP ACTIONS
// Get actions waiting for confirmation (for potential UI display)
// ============================================
export const getPendingWhatsAppActions = async () => {
  const userId = await getUserId();

  // First get the whatsapp_user_id for this user
  const { data: whatsappUser, error: userError } = await supabase
    .from('whatsapp_users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (userError || !whatsappUser) {
    return { actions: [] };
  }

  const { data, error } = await supabase
    .from('whatsapp_pending_actions')
    .select('*')
    .eq('whatsapp_user_id', whatsappUser.id)
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
// FORMAT PHONE NUMBER FOR DISPLAY
// Formats +5491123456789 to +54 9 11 2345-6789
// ============================================
export const formatPhoneForDisplay = (phone) => {
  if (!phone || phone.startsWith('pending_')) return null;

  // Basic formatting for Argentine numbers
  if (phone.startsWith('+54')) {
    const digits = phone.slice(3); // Remove +54
    if (digits.length >= 10) {
      const areaCode = digits.slice(0, 1) === '9' ? digits.slice(1, 3) : digits.slice(0, 2);
      const rest = digits.slice(-8);
      return `+54 9 ${areaCode} ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }
  }

  return phone;
};

// ============================================
// REQUEST WHATSAPP ACCESS
// Sends a notification email to admin
// ============================================
export const requestWhatsAppAccess = async () => {
  const userId = await getUserId();

  // Get user info
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (!profile) {
    throw new Error('No se pudo obtener información del usuario');
  }

  // Call the Edge Function to send email
  const { data, error } = await supabase.functions.invoke('send-access-request', {
    body: {
      userId,
      email: profile.email,
      name: profile.full_name
    }
  });

  if (error) {
    console.error('Error requesting access:', error);
    throw error;
  }

  return { success: true };
};
