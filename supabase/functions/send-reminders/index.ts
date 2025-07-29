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

    // Get current date and tomorrow's date
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    console.log(`Checking for debts due on ${todayStr} and ${tomorrowStr}`)

    // Get debts that are due today or tomorrow and are still pending
    let debtsQuery = supabaseClient
      .from('debts')
      .select(`
        id,
        amount,
        due_date,
        description,
        user_id,
        customers!inner(
          id,
          name,
          email
        ),
        telegram_users(
          telegram_chat_id,
          is_active
        )
      `)
      .eq('status', 'pending')
      .in('due_date', [todayStr, tomorrowStr])

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
        // Check if reminder already sent today
        const { data: existingReminder, error: reminderError } = await supabaseClient
          .from('reminders')
          .select('id')
          .eq('debt_id', debt.id)
          .gte('created_at', todayStr)
          .maybeSingle()

        if (reminderError) {
          console.error(`Error checking existing reminder for debt ${debt.id}:`, reminderError)
          errorCount++
          continue
        }

        if (existingReminder) {
          console.log(`Reminder already sent for debt ${debt.id}`)
          continue
        }

        const customer = debt.customers
        const dueDate = new Date(debt.due_date)
        const isToday = debt.due_date === todayStr
        const dayText = isToday ? 'BUGÜN' : 'YARIN'
        const urgencyEmoji = isToday ? '🚨' : '⏰'

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

        // Prepare message content
        const messageContent = 
          `${urgencyEmoji} **BORÇ HATIRLATMASI** ${urgencyEmoji}\n\n` +
          `Sayın **${customer.name}**,\n\n` +
          `💰 **Tutar:** ${formattedAmount}\n` +
          `📅 **Vade Tarihi:** ${formattedDate} (${dayText})\n` +
          `📝 **Açıklama:** ${debt.description ?? 'Belirtilmemiş'}\n\n` +
          `${isToday ? '⚠️ Ödeme vadesi bugün dolmaktadır!' : '📢 Ödeme vadesi yarın dolacaktır.'}\n\n` +
          `Lütfen en kısa sürede ödemenizi gerçekleştirin.\n\n` +
          `Teşekkürler! 🙏`

        // Send Telegram reminder if user has Telegram
        if (debt.telegram_users && debt.telegram_users.length > 0) {
          const telegramUser = debt.telegram_users[0]
          if (telegramUser.is_active) {
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
        }

        // Send Email reminder
        const emailSent = await sendEmailReminder(
          customer.email,
          customer.name,
          messageContent,
          `Borç Hatırlatması - ${formattedDate}`
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
