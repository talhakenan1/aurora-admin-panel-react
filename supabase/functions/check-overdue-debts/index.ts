import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DebtWithCustomer {
  id: string;
  amount: number;
  due_date: string;
  customer_id: string;
  user_id: string;
  status: string;
  customers: {
    name: string;
    phone: string;
  };
}

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

    console.log('Checking for overdue debts...');

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch debts that are due today and still pending
    const { data: overdueDebts, error: debtsError } = await supabase
      .from('debts')
      .select(`
        id,
        amount,
        due_date,
        customer_id,
        user_id,
        status,
        customers (
          name,
          phone
        )
      `)
      .eq('status', 'pending')
      .lte('due_date', today.toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (debtsError) {
      console.error('Error fetching debts:', debtsError);
      throw debtsError;
    }

    console.log(`Found ${overdueDebts?.length || 0} overdue debts`);

    if (!overdueDebts || overdueDebts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No overdue debts found',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group debts by user_id
    const debtsByUser: Record<string, DebtWithCustomer[]> = {};
    overdueDebts.forEach((debt: DebtWithCustomer) => {
      if (!debtsByUser[debt.user_id]) {
        debtsByUser[debt.user_id] = [];
      }
      debtsByUser[debt.user_id].push(debt);
    });

    let notificationsSent = 0;
    let notificationsFailed = 0;

    // Send notifications to each business owner
    for (const [userId, userDebts] of Object.entries(debtsByUser)) {
      console.log(`Processing ${userDebts.length} debts for user ${userId}`);

      // Get notification preferences
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Check if daily notifications are enabled (default: true)
      if (preferences && !preferences.daily_enabled) {
        console.log(`Daily notifications disabled for user ${userId}`);
        continue;
      }

      // Filter by minimum debt amount if set
      let filteredDebts = userDebts;
      if (preferences && preferences.minimum_debt_amount) {
        filteredDebts = userDebts.filter(debt => 
          Number(debt.amount) >= Number(preferences.minimum_debt_amount)
        );
      }

      if (filteredDebts.length === 0) {
        console.log(`No debts meet minimum amount criteria for user ${userId}`);
        continue;
      }

      // Find business owner's Telegram account
      const { data: telegramUser } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('user_id', userId)
        .eq('user_type', 'business_owner')
        .eq('is_active', true)
        .single();

      if (!telegramUser) {
        console.log(`No active Telegram account found for user ${userId}`);
        continue;
      }

      // Calculate totals
      const totalAmount = filteredDebts.reduce((sum, debt) => sum + Number(debt.amount), 0);
      
      // Build notification message
      let message = `🚨 GECİKMİŞ BORÇ BİLDİRİMİ\n\n`;
      message += `📋 ${filteredDebts.length} adet gecikmiş borç\n`;
      message += `💰 Toplam: ${totalAmount.toFixed(2)} ₺\n\n`;
      message += `Müşteriler:\n`;
      
      filteredDebts.forEach((debt) => {
        const dueDate = new Date(debt.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        message += `• ${debt.customers.name} - ${Number(debt.amount).toFixed(2)} ₺ (${daysOverdue} gün gecikme)\n`;
      });

      message += `\n🌐 Borçları görüntülemek için web paneline giriş yapın.`;

      // Send Telegram message
      const success = await sendTelegramMessage(
        telegramUser.telegram_chat_id,
        message,
        telegramBotToken
      );

      if (success) {
        notificationsSent++;
        console.log(`Notification sent to user ${userId}`);

        // Log reminders for each debt
        for (const debt of filteredDebts) {
          await supabase
            .from('reminders')
            .insert({
              debt_id: debt.id,
              user_id: debt.user_id,
              reminder_type: 'telegram',
              status: 'sent',
              scheduled_date: new Date().toISOString(),
              sent_at: new Date().toISOString(),
              message_content: message
            });
        }
      } else {
        notificationsFailed++;
        console.error(`Failed to send notification to user ${userId}`);

        // Log failed reminders
        for (const debt of filteredDebts) {
          await supabase
            .from('reminders')
            .insert({
              debt_id: debt.id,
              user_id: debt.user_id,
              reminder_type: 'telegram',
              status: 'failed',
              scheduled_date: new Date().toISOString(),
              error_message: 'Failed to send Telegram message',
              message_content: message
            });
        }
      }
    }

    console.log(`Notifications sent: ${notificationsSent}, failed: ${notificationsFailed}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: Object.keys(debtsByUser).length,
        sent: notificationsSent,
        failed: notificationsFailed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-overdue-debts:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function sendTelegramMessage(
  chatId: number,
  text: string,
  botToken: string
): Promise<boolean> {
  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
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
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}
