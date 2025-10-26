import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTelegramVerification() {
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const createVerificationCode = async () => {
    if (!user) return;

    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    const { error } = await supabase
      .from('verification_codes')
      .insert({
        user_id: user.id,
        code,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (!error) {
      setVerificationCode(code);
    }
  };

  const checkRegistrationStatus = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Check if user has an active Telegram registration
    const { data } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('user_type', 'business_owner')
      .eq('is_active', true)
      .single();

    setIsRegistered(!!data);

    // If not registered, check for existing valid code or create new one
    if (!data) {
      const { data: existingCode } = await supabase
        .from('verification_codes')
        .select('code')
        .eq('user_id', user.id)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingCode) {
        setVerificationCode(existingCode.code);
      } else {
        await createVerificationCode();
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    checkRegistrationStatus();
  }, [user]);

  const refreshCode = async () => {
    setIsLoading(true);
    await createVerificationCode();
    setIsLoading(false);
  };

  const deactivate = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('telegram_users')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('user_type', 'business_owner');

    if (!error) {
      setIsRegistered(false);
      await createVerificationCode();
    }
  };

  return {
    verificationCode,
    isRegistered,
    isLoading,
    refreshCode,
    deactivate,
    checkRegistrationStatus
  };
}
