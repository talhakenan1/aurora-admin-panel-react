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
    const supabaseUrl = 'https://cywngfflmpdpuqaigsjc.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5d25nZmZsbXBkcHVxYWlnc2pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMjUyMTQsImV4cCI6MjA2NDcwMTIxNH0.-fFn7DEY-XDxf3LwNkSFJJuMTT1Mrd4Qbs7Hims-w_g';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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

      // Handle /start command
      if (text === '/start') {
        const welcomeMsg = `🤖 Merhaba ${firstName}!\n\nBu bot ile müşterilerinize bildirim gönderebilirsiniz.\n\n📝 Komutlar:\n/send [telefon] [mesaj] - Müşteriye mesaj gönder\n/help - Yardım`;
        await sendTelegramMessage(chatId, welcomeMsg);
        await logMessage(chatId, welcomeMsg, 'outgoing');
        
        // Register user if not exists
        if (!existingUser) {
          await supabase
            .from('telegram_users')
            .insert({
              telegram_chat_id: chatId,
              telegram_username: username,
              user_id: null,
              customer_id: null,
              is_active: true
            });
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle /help command
      if (text === '/help') {
        const helpMsg = `📖 Yardım\n\n🔹 /send [telefon] [mesaj]\nBelirtilen telefon numarasındaki müşteriye mesaj gönderir.\n\nÖrnek:\n/send 05551234567 Merhaba, borç hatırlatması\n\n🔹 /start\nBotu başlatır ve hoş geldiniz mesajı gösterir.`;
        await sendTelegramMessage(chatId, helpMsg);
        await logMessage(chatId, helpMsg, 'outgoing');
        
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Default response for unknown commands
      const defaultMsg = `❓ Bilinmeyen komut: "${text}"\n\nKomutlar:\n/send [telefon] [mesaj] - Müşteriye mesaj gönder\n/help - Yardım`;
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