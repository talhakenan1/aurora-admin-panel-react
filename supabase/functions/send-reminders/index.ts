import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DebtWithCustomer {
  id: string
  amount: number
  due_date: string
  description: string | null
  user_id: string
  customers: {
    id: string
    name: string
    email: string
  }
  telegram_users?: {
    telegram_chat_id: number
    is_active: boolean
  }[]
}

interface ReminderResult {
  processed: number
  sent: number
  errors: number
  timestamp: string
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response('Server configuration error', { status: 500, headers: corsHeaders })
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Parse request body to get user_id
    let requestBody: any = {}
    try {
      const bodyText = await req.text()
      if (bodyText) {
        requestBody = JSON.parse(bodyText)
      }
    } catch (error) {
      console.log('No valid JSON body provided, proceeding without user filter')
    }

    const userIdFilter = requestBody.user_id
    console.log('Starting reminder check...', userIdFilter ? `for user: ${userIdFilter}` : 'for all users')

    // Get current date and yesterday's date
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    console.log(`Checking for overdue debts with due date: ${yesterdayStr} (yesterday)`)

    // Get debts that had due date yesterday and are still pending (now overdue)
    let debtsQuery = supabaseClient
      .from('debts')
      .select(`
        id,
        amount,
        due_date,
        description,
        user_id,
        customer_id,
        customers!inner(
          id,
          name,
          email,
          phone
        )
      `)
      .eq('status', 'pending')
      .eq('due_date', yesterdayStr)

    // Add user filter if provided
    if (userIdFilter) {
      debtsQuery = debtsQuery.eq('user_id', userIdFilter)
    }

    const { data: debts, error: debtsError } = await debtsQuery

    if (debtsError) {
      console.error('Error fetching debts:', debtsError)
      return new Response('Error fetching debts', { status: 500, headers: corsHeaders })
    }

    if (!debts || debts.length === 0) {
      console.log('No debts found for reminder')
      return new Response('No debts to remind', { status: 200, headers: corsHeaders })
    }

    console.log(`Found ${debts.length} debts to process`)

    let sentCount = 0
    let errorCount = 0

    for (const debt of debts as DebtWithCustomer[]) {
      try {
        // Check if reminder already sent for this debt (to avoid duplicate notifications)
        const { data: existingReminder, error: reminderError } = await supabaseClient
          .from('reminders')
          .select('id')
          .eq('debt_id', debt.id)
          .eq('reminder_type', 'telegram')
          .gte('created_at', todayStr)
          .maybeSingle()

        if (reminderError) {
          console.error(`Error checking existing reminder for debt ${debt.id}:`, reminderError)
          errorCount++
          continue
        }

        if (existingReminder) {
          console.log(`Reminder already sent today for debt ${debt.id}`)
          continue
        }

        const customer = debt.customers
        const dueDate = new Date(debt.due_date)
        const urgencyEmoji = '🚨'

        // Format amount with Turkish Lira
        const formattedAmount = new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency: 'TRY'
        }).format(debt.amount)

        // Format date
        const formattedDate = dueDate.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })

        // Calculate how many days overdue
        const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        const overdueDays = daysDiff > 0 ? daysDiff : 1

        // Prepare message content for overdue debt
        const messageContent = 
          `${urgencyEmoji} **GECİKMİŞ BORÇ BİLDİRİMİ** ${urgencyEmoji}\n\n` +
          `Sayın **${customer.name}**,\n\n` +
          `💰 **Tutar:** ${formattedAmount}\n` +
          `📅 **Son Ödeme Tarihi:** ${formattedDate}\n` +
          `⏱️ **Gecikme Süresi:** ${overdueDays} gün\n` +
          `📝 **Açıklama:** ${debt.description ?? 'Belirtilmemiş'}\n\n` +
          `⚠️ **Ödeme vadesi geçmiştir!**\n\n` +
          `Lütfen en kısa sürede ödemenizi gerçekleştirin.\n\n` +
          `Teşekkürler! 🙏`

        // Check if customer has Telegram and send reminder
        const { data: telegramUsers, error: telegramError } = await supabaseClient
          .from('telegram_users')
          .select('telegram_chat_id, is_active')
          .eq('customer_id', debt.customer_id)
          .eq('is_active', true)
          .limit(1)

        if (!telegramError && telegramUsers && telegramUsers.length > 0) {
          const telegramUser = telegramUsers[0]
          const telegramSent = await sendTelegramMessage(
            telegramUser.telegram_chat_id,
            messageContent
          )

          // Log telegram reminder
          await supabaseClient
            .from('reminders')
            .insert({
              debt_id: debt.id,
              user_id: debt.user_id,
              reminder_type: 'telegram',
              scheduled_date: new Date().toISOString(),
              sent_at: telegramSent ? new Date().toISOString() : null,
              status: telegramSent ? 'sent' : 'failed',
              message_content: messageContent,
              error_message: telegramSent ? null : 'Failed to send telegram message'
            })

          if (telegramSent) {
            sentCount++
            console.log(`Telegram reminder sent for debt ${debt.id}`)
          } else {
            errorCount++
            console.log(`Failed to send telegram reminder for debt ${debt.id}`)
          }
        }

        // Send Email reminder (optional, can be removed if only Telegram needed)
        const emailSent = await sendEmailReminder(
          customer.email,
          customer.name,
          messageContent,
          `Gecikmiş Borç Bildirimi - ${formattedDate}`
        )

        // Log email reminder
        await supabaseClient
          .from('reminders')
          .insert({
            debt_id: debt.id,
            user_id: debt.user_id,
            reminder_type: 'email',
            scheduled_date: new Date().toISOString(),
            sent_at: emailSent ? new Date().toISOString() : null,
            status: emailSent ? 'sent' : 'failed',
            message_content: messageContent,
            error_message: emailSent ? null : 'Failed to send email'
          })

        if (emailSent) {
          sentCount++
          console.log(`Email reminder sent for debt ${debt.id}`)
        } else {
          errorCount++
          console.log(`Failed to send email reminder for debt ${debt.id}`)
        }

      } catch (error) {
        console.error(`Error processing debt ${debt.id}:`, error)
        errorCount++
      }
    }

    const result: ReminderResult = {
      processed: debts.length,
      sent: sentCount,
      errors: errorCount,
      timestamp: new Date().toISOString()
    }

    console.log('Reminder process completed:', result)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in send-reminders function:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})
async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not found')
    return false
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Telegram API error:', errorText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending telegram message:', error)
    return false
  }
}

async function sendEmailReminder(
  email: string,
  name: string,
  content: string,
  subject: string
): Promise<boolean> {
  const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY')
  const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@yourcompany.com'
  
  if (!sendGridApiKey) {
    console.error('SENDGRID_API_KEY not found')
    return false
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: email, name: name }],
          subject: subject
        }],
        from: { email: fromEmail, name: 'Borç Hatırlatma Sistemi' },
        content: [{
          type: 'text/plain',
          value: content.replace(/\*\*/g, '').replace(/\n/g, '\r\n')
        }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SendGrid API error:', errorText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}
