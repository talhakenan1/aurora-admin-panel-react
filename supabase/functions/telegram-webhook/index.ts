import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://cywngfflmpdpuqaigsjc.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!telegramBotToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const body = await req.json();
    console.log('Telegram webhook received:', JSON.stringify(body, null, 2));

    // Send bot message helper function
    async function sendTelegramMessage(chatId: number, text: string) {
      const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      
      try {
        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Telegram API error:', errorData);
        }
        
        return response.ok;
      } catch (error) {
        console.error('Error sending message:', error);
        return false;
      }
    }

    // Log message to database
    async function logMessage(chatId: number, text: string, direction: string, userId?: string) {
      await supabase
        .from('telegram_messages')
        .insert({
          telegram_chat_id: chatId,
          message_text: text,
          direction: direction,
          user_id: userId || null
        });
    }

    // Process incoming message
    if (body.message) {
      const message = body.message;
      const chatId = message.chat.id;
      const text = message.text || '';
      const username = message.from?.username || '';
      const firstName = message.from?.first_name || '';

      console.log(`Message from ${firstName} (@${username}): ${text}`);

      // Log incoming message
      await logMessage(chatId, text, 'incoming');

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('telegram_chat_id', chatId)
        .single();

      // Handle /send command
      if (text.startsWith('/send ')) {
        const parts = text.split(' ');
        if (parts.length < 3) {
          const errorMsg = '❌ Kullanım: /send [telefon_numarası] [mesaj]\n\nÖrnek: /send 05551234567 Merhaba, borç hatırlatması';
          await sendTelegramMessage(chatId, errorMsg);
          await logMessage(chatId, errorMsg, 'outgoing');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const phoneNumber = parts[1];
        const messageToSend = parts.slice(2).join(' ');

        // Find customer by phone number
        const { data: customerData, error } = await supabase
          .rpc('find_customer_by_phone', { phone_number: phoneNumber });

        if (error) {
          console.error('Error finding customer:', error);
          const errorMsg = '❌ Müşteri arama sırasında hata oluştu.';
          await sendTelegramMessage(chatId, errorMsg);
          await logMessage(chatId, errorMsg, 'outgoing');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!customerData || customerData.length === 0) {
          const errorMsg = `❌ ${phoneNumber} numarası ile kayıtlı müşteri bulunamadı.`;
          await sendTelegramMessage(chatId, errorMsg);
          await logMessage(chatId, errorMsg, 'outgoing');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const customer = customerData[0];
        
        // Check if the customer has a linked telegram user
        const { data: telegramUser } = await supabase
          .from('telegram_users')
          .select('*')
          .eq('customer_id', customer.customer_id)
          .eq('is_active', true)
          .single();

        if (!telegramUser) {
          const errorMsg = `❌ ${customer.customer_name} (${phoneNumber}) için aktif Telegram hesabı bulunamadı.`;
          await sendTelegramMessage(chatId, errorMsg);
          await logMessage(chatId, errorMsg, 'outgoing');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Send message to customer's telegram
        const success = await sendTelegramMessage(telegramUser.telegram_chat_id, messageToSend);
        
        if (success) {
          const successMsg = `✅ Mesaj başarıyla gönderildi:\n👤 ${customer.customer_name}\n📱 ${phoneNumber}\n💬 "${messageToSend}"`;
          await sendTelegramMessage(chatId, successMsg);
          await logMessage(chatId, successMsg, 'outgoing');
          await logMessage(telegramUser.telegram_chat_id, messageToSend, 'outgoing', customer.user_id);
        } else {
          const errorMsg = `❌ Mesaj gönderilirken hata oluştu. ${customer.customer_name} (${phoneNumber}) ulaşılamıyor olabilir.`;
          await sendTelegramMessage(chatId, errorMsg);
          await logMessage(chatId, errorMsg, 'outgoing');
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle /register_owner command
      if (text.startsWith('/register_owner ')) {
        const parts = text.split(' ');
        if (parts.length !== 2) {
          const errorMsg = '❌ Kullanım: /register_owner [doğrulama_kodu]\n\nÖrnek: /register_owner 123456';
          await sendTelegramMessage(chatId, errorMsg);
          await logMessage(chatId, errorMsg, 'outgoing');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const code = parts[1];

        // Find verification code
        const { data: verificationData, error: verificationError } = await supabase
          .from('verification_codes')
          .select('*, user_id')
          .eq('code', code)
          .eq('used', false)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (verificationError || !verificationData) {
          const errorMsg = '❌ Geçersiz veya süresi dolmuş doğrulama kodu.';
          await sendTelegramMessage(chatId, errorMsg);
          await logMessage(chatId, errorMsg, 'outgoing');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if business owner already registered
        const { data: existingOwner } = await supabase
          .from('telegram_users')
          .select('*')
          .eq('user_id', verificationData.user_id)
          .eq('user_type', 'business_owner')
          .single();

        if (existingOwner) {
          // Update existing registration
          await supabase
            .from('telegram_users')
            .update({
              telegram_chat_id: chatId,
              telegram_username: username,
              is_active: true
            })
            .eq('id', existingOwner.id);
        } else {
          // Register new business owner
          await supabase
            .from('telegram_users')
            .insert({
              telegram_chat_id: chatId,
              telegram_username: username,
              user_id: verificationData.user_id,
              customer_id: null,
              user_type: 'business_owner',
              is_active: true
            });
        }

        // Mark code as used
        await supabase
          .from('verification_codes')
          .update({ used: true })
          .eq('id', verificationData.id);

        const successMsg = '✅ Telegram hesabınız başarıyla kaydedildi!\n\nArtık gecikmiş borç bildirimleri alacaksınız.';
        await sendTelegramMessage(chatId, successMsg);
        await logMessage(chatId, successMsg, 'outgoing', verificationData.user_id);

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle /start command
      if (text === '/start') {
        const welcomeMsg = `🤖 Merhaba ${firstName}!\n\nBu bot ile borç hatırlatmaları alabilirsiniz.\n\n📝 İlk Kurulum:\n1️⃣ Web sitesine giriş yapın\n2️⃣ Ayarlar sayfasını açın\n3️⃣ 6 haneli doğrulama kodunu kopyalayın\n4️⃣ Buraya şu komutu yazın:\n/register_owner [kodunuz]\n\nÖrnek: /register_owner 123456\n\n💡 Yardım için: /help`;
        await sendTelegramMessage(chatId, welcomeMsg);
        await logMessage(chatId, welcomeMsg, 'outgoing');
        
        // Register user if not exists (as customer type by default)
        if (!existingUser) {
          await supabase
            .from('telegram_users')
            .insert({
              telegram_chat_id: chatId,
              telegram_username: username,
              user_id: null,
              customer_id: null,
              user_type: 'customer',
              is_active: true
            });
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle /register command (redirect to /register_owner)
      if (text === '/register') {
        const registerMsg = '❌ Yanlış komut!\n\n✅ Doğru kullanım:\n/register_owner [doğrulama_kodu]\n\nÖrnek:\n/register_owner 123456\n\n💡 Doğrulama kodunuzu web sitesinin Ayarlar sayfasından alabilirsiniz.';
        await sendTelegramMessage(chatId, registerMsg);
        await logMessage(chatId, registerMsg, 'outgoing');
        
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle /help command
      if (text === '/help') {
        const helpMsg = `📖 Yardım\n\n🔹 /start\nBotu başlatır ve hoş geldiniz mesajı gösterir.\n\n🔹 /register_owner [kod]\nİşletme sahibi olarak kaydolun ve otomatik bildirimler alın.\n\nÖrnek:\n/register_owner 123456\n\n💡 Kodu web sitesinin Ayarlar sayfasından alın.\n\n🔹 /send [telefon] [mesaj]\nMüşteriye mesaj gönderir (sadece kayıtlı işletme sahipleri).\n\nÖrnek:\n/send 05551234567 Ödeme hatırlatması`;
        await sendTelegramMessage(chatId, helpMsg);
        await logMessage(chatId, helpMsg, 'outgoing');
        
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Default response for unknown commands
      const defaultMsg = `❓ Bilinmeyen komut: "${text}"\n\n📝 Kullanılabilir komutlar:\n/start - Başlat\n/register_owner [kod] - Kaydol\n/help - Yardım\n\n💡 Daha fazla bilgi için /help yazın.`;
      await sendTelegramMessage(chatId, defaultMsg);
      await logMessage(chatId, defaultMsg, 'outgoing');
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in telegram-webhook:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});