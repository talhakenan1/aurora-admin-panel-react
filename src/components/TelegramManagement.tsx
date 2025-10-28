import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Users, Settings, Send, Copy, Check, Link2, Info, Trash2, Bot } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
}

interface TelegramUser {
  id: string
  customer_id: string
  telegram_chat_id: number
  telegram_username?: string
  telegram_first_name?: string
  telegram_last_name?: string
  is_active: boolean
  created_at: string
  customers: Customer
}

interface ReminderSettings {
  id: string
  user_id: string
  reminder_days_before: number[]
  reminder_time: string
  email_enabled: boolean
  telegram_enabled: boolean
  created_at: string
}

const TelegramManagement: React.FC = () => {
  const [telegramUsers, setTelegramUsers] = useState<TelegramUser[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [webhookInfo, setWebhookInfo] = useState<any>(null)
  const [webhookLoading, setWebhookLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [newSettings, setNewSettings] = useState({
    reminder_days_before: [1, 3, 7],
    reminder_time: '09:00',
    email_enabled: true,
    telegram_enabled: true
  })

  const botToken = '8012766744:AAEXzvBDYi9SPtKdb5MnkdMVHS6Rm3CddaI'
  const botUsername = 'PhoneReminderBot'
  const botLink = `https://t.me/${botUsername}`

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (customersError) throw customersError
      setCustomers(customersData || [])

      // Fetch telegram users with customer info
      const { data: telegramData, error: telegramError } = await supabase
        .from('telegram_users')
        .select(`
          *,
          customers(
            id,
            name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (telegramError) throw telegramError
      setTelegramUsers(telegramData || [])

      // Fetch reminder settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('reminder_settings')
        .select('*')
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError
      }
      setReminderSettings(settingsData)
      
      if (settingsData) {
        setNewSettings({
          reminder_days_before: settingsData.reminder_days_before || [1, 3, 7],
          reminder_time: settingsData.reminder_time,
          email_enabled: settingsData.email_enabled,
          telegram_enabled: settingsData.telegram_enabled
        })
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Hata',
        description: 'Veriler yüklenirken bir hata oluştu.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      if (!user?.id) {
        toast({
          title: 'Hata',
          description: 'Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.',
          variant: 'destructive'
        })
        return
      }

      const settingsData = {
        reminder_days_before: newSettings.reminder_days_before,
        reminder_time: newSettings.reminder_time,
        email_enabled: newSettings.email_enabled,
        telegram_enabled: newSettings.telegram_enabled,
        user_id: user.id
      }

      if (reminderSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('reminder_settings')
          .update(settingsData)
          .eq('id', reminderSettings.id)

        if (error) throw error
      } else {
        // Create new settings
        const { error } = await supabase
          .from('reminder_settings')
          .insert(settingsData)

        if (error) throw error
      }

      toast({
        title: 'Başarılı',
        description: 'Hatırlatma ayarları kaydedildi.'
      })

      setIsSettingsDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Hata',
        description: 'Ayarlar kaydedilirken bir hata oluştu.',
        variant: 'destructive'
      })
    }
  }

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('telegram_users')
        .update({ is_active: !isActive })
        .eq('id', userId)

      if (error) throw error

      toast({
        title: 'Başarılı',
        description: `Kullanıcı ${!isActive ? 'aktif' : 'pasif'} edildi.`
      })

      fetchData()
    } catch (error) {
      console.error('Error toggling user status:', error)
      toast({
        title: 'Hata',
        description: 'Kullanıcı durumu güncellenirken bir hata oluştu.',
        variant: 'destructive'
      })
    }
  }

  const handleSendBroadcast = async () => {
    try {
      if (!broadcastMessage.trim()) {
        toast({
          title: 'Hata',
          description: 'Lütfen bir mesaj yazın.',
          variant: 'destructive'
        })
        return
      }

      const activeUsers = telegramUsers.filter(user => user.is_active)
      let successCount = 0
      let errorCount = 0

      for (const user of activeUsers) {
        try {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              chat_id: user.telegram_chat_id,
              text: broadcastMessage,
              parse_mode: 'Markdown'
            })
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
        }
      }

      toast({
        title: 'Broadcast Tamamlandı',
        description: `${successCount} başarılı, ${errorCount} hata.`
      })

      setBroadcastMessage('')
      setIsBroadcastDialogOpen(false)
    } catch (error) {
      console.error('Error sending broadcast:', error)
      toast({
        title: 'Hata',
        description: 'Broadcast gönderilirken bir hata oluştu.',
        variant: 'destructive'
      })
    }
  }

  const copyBotLink = async () => {
    try {
      await navigator.clipboard.writeText(botLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: 'Kopyalandı',
        description: 'Bot linki panoya kopyalandı.'
      })
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Link kopyalanamadı.',
        variant: 'destructive'
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleWebhookAction = async (action: string) => {
    try {
      setWebhookLoading(true)
      const { data, error } = await supabase.functions.invoke('telegram-bot-setup', {
        body: { action }
      })

      if (error) throw error

      setWebhookInfo(data)
      toast({
        title: 'Başarılı',
        description: data.message || 'İşlem tamamlandı.'
      })
    } catch (error: any) {
      console.error('Webhook action error:', error)
      toast({
        title: 'Hata',
        description: error.message || 'İşlem sırasında bir hata oluştu.',
        variant: 'destructive'
      })
    } finally {
      setWebhookLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Oturum Gerekli</h2>
          <p className="text-gray-600">Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-card rounded-xl border shadow-sm p-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Telegram Yönetimi
              </h1>
              <p className="text-muted-foreground text-lg">
                Telegram bot kullanıcılarını yönetin ve ayarları yapılandırın
              </p>
            </div>
            <div className="flex gap-3">
              <Dialog open={isBroadcastDialogOpen} onOpenChange={setIsBroadcastDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="flex items-center gap-2 hover:scale-105 transition-transform">
                    <Send className="h-4 w-4" />
                    Toplu Mesaj
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Toplu Mesaj Gönder</DialogTitle>
                <DialogDescription>
                  Tüm aktif Telegram kullanıcılarına mesaj gönderin.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="broadcast-message">Mesaj</Label>
                  <Textarea
                    id="broadcast-message"
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Gönderilecek mesajı yazın..."
                    rows={4}
                  />
                </div>
                <div className="text-sm text-gray-500">
                  {telegramUsers.filter(user => user.is_active).length} aktif kullanıcıya gönderilecek
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsBroadcastDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={handleSendBroadcast}>
                    Gönder
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
              <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="flex items-center gap-2 hover:scale-105 transition-transform shadow-lg">
                    <Settings className="h-4 w-4" />
                    Ayarlar
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Hatırlatma Ayarları</DialogTitle>
                <DialogDescription>
                  Otomatik hatırlatma sistemini yapılandırın.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reminder-time">Hatırlatma Saati</Label>
                  <Input
                    id="reminder-time"
                    type="time"
                    value={newSettings.reminder_time}
                    onChange={(e) => setNewSettings({...newSettings, reminder_time: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Hatırlatma Günleri (Vade öncesi)</Label>
                  <div className="flex gap-2 mt-2">
                    {[1, 3, 7, 14, 30].map(day => (
                      <Button
                        key={day}
                        size="sm"
                        variant={newSettings.reminder_days_before.includes(day) ? 'default' : 'outline'}
                        onClick={() => {
                          const days = newSettings.reminder_days_before.includes(day)
                            ? newSettings.reminder_days_before.filter(d => d !== day)
                            : [...newSettings.reminder_days_before, day].sort((a, b) => a - b)
                          setNewSettings({...newSettings, reminder_days_before: days})
                        }}
                      >
                        {day} gün
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="email-enabled"
                      checked={newSettings.email_enabled}
                      onChange={(e) => setNewSettings({...newSettings, email_enabled: e.target.checked})}
                    />
                    <Label htmlFor="email-enabled">E-posta hatırlatmaları aktif</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="telegram-enabled"
                      checked={newSettings.telegram_enabled}
                      onChange={(e) => setNewSettings({...newSettings, telegram_enabled: e.target.checked})}
                    />
                    <Label htmlFor="telegram-enabled">Telegram hatırlatmaları aktif</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={handleSaveSettings}>
                    Kaydet
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
            </div>
          </div>
        </div>

        {/* Bot Info Card */}
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-r from-card to-card/80">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              Bot Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-6 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-full">
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </div>
                    @{botUsername}
                  </h3>
                  <p className="text-muted-foreground">Müşteriler bu botu kullanarak kayıt olabilir</p>
                </div>
                <div className="flex gap-3 mt-4 lg:mt-0">
                  <Button variant="outline" onClick={copyBotLink} className="hover:scale-105 transition-transform">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Kopyalandı' : 'Linki Kopyala'}
                  </Button>
                  <Button asChild className="hover:scale-105 transition-transform shadow-md">
                    <a href={botLink} target="_blank" rel="noopener noreferrer">
                      Bot'u Aç
                    </a>
                  </Button>
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-foreground">
                  <span className="text-primary">Kullanım:</span> Müşteriler botu başlatıp <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/register</code> komutu ile kayıt olabilir.
                </div>
                <div className="text-sm font-medium text-foreground">
                  <span className="text-primary">Komutlar:</span> /start, /register, /help, /status
                </div>
              </div>
            </div>
        </CardContent>
      </Card>

        {/* Webhook Management Card */}
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-r from-card to-card/80">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              Webhook Yönetimi
            </CardTitle>
            <CardDescription>
              Telegram bot'u ile web siteniz arasındaki bağlantıyı kurun ve yönetin
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  ⚠️ Önemli: Bot'un çalışması için webhook kurulumu gereklidir
                </p>
                <p className="text-sm text-yellow-700">
                  Webhook, Telegram'dan gelen mesajları bu uygulamaya iletir. İlk kullanımda "Webhook Kur" butonuna tıklayın.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  onClick={() => handleWebhookAction('set_webhook')}
                  disabled={webhookLoading}
                  className="flex items-center gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  {webhookLoading ? 'İşleniyor...' : 'Webhook Kur'}
                </Button>

                <Button
                  onClick={() => handleWebhookAction('get_webhook_info')}
                  disabled={webhookLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Info className="h-4 w-4" />
                  Webhook Bilgisi
                </Button>

                <Button
                  onClick={() => handleWebhookAction('get_bot_info')}
                  disabled={webhookLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Bot className="h-4 w-4" />
                  Bot Bilgisi
                </Button>

                <Button
                  onClick={() => handleWebhookAction('delete_webhook')}
                  disabled={webhookLoading}
                  variant="outline"
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Webhook Sil
                </Button>
              </div>

              {webhookInfo && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-semibold mb-2 text-sm">Son İşlem Sonucu:</h4>
                  <pre className="text-xs overflow-auto p-3 bg-background rounded border">
                    {JSON.stringify(webhookInfo, null, 2)}
                  </pre>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-blue-900 mb-2">Webhook URL:</h4>
                <code className="text-xs bg-blue-100 px-2 py-1 rounded block overflow-x-auto">
                  https://cywngfflmpdpuqaigsjc.supabase.co/functions/v1/telegram-webhook
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Kullanıcı</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{telegramUsers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Kayıtlı kullanıcı</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aktif Kullanıcı</CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {telegramUsers.filter(user => user.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Mesaj alıyor</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pasif Kullanıcı</CardTitle>
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Users className="h-5 w-5 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {telegramUsers.filter(user => !user.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Mesaj almıyor</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b">
            <CardTitle className="text-xl">Telegram Kullanıcıları</CardTitle>
            <CardDescription>
              Bot'a kayıt olan kullanıcıları görüntüleyin ve yönetin
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left p-4 font-semibold">Müşteri</th>
                    <th className="text-left p-4 font-semibold">Telegram Bilgileri</th>
                    <th className="text-left p-4 font-semibold">Durum</th>
                    <th className="text-left p-4 font-semibold">Kayıt Tarihi</th>
                    <th className="text-left p-4 font-semibold">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {telegramUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div>
                          <div className="font-semibold text-foreground">
                            {user.customers ? user.customers.name : 'İşletme Sahibi'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.customers ? user.customers.email : user.telegram_username || 'Email yok'}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-foreground">
                            {user.telegram_username ? `@${user.telegram_username}` : 'Kullanıcı adı yok'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.telegram_first_name} {user.telegram_last_name}
                          </div>
                          <div className="text-xs text-muted-foreground/70">
                            Chat ID: {user.telegram_chat_id}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={user.is_active ? 'default' : 'secondary'} className="font-medium">
                          {user.is_active ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{formatDate(user.created_at)}</td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                          className="hover:scale-105 transition-transform"
                        >
                          {user.is_active ? 'Pasif Et' : 'Aktif Et'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {telegramUsers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium">Henüz Telegram kullanıcısı bulunmuyor</p>
                  <p className="text-sm">Müşteriler botu kullanarak kayıt olabilir</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Settings */}
        {reminderSettings && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b">
              <CardTitle className="text-xl flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                Mevcut Ayarlar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">Hatırlatma Saati</Label>
                  <p className="text-xl font-bold text-foreground">{reminderSettings.reminder_time}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">Hatırlatma Günleri</Label>
                  <div className="flex gap-2 mt-1">
                    {(reminderSettings.reminder_days_before || []).map(day => (
                      <Badge key={day} variant="outline" className="font-medium">{day} gün</Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">E-posta</Label>
                  <div>
                    <Badge variant={reminderSettings.email_enabled ? 'default' : 'secondary'} className="font-medium">
                      {reminderSettings.email_enabled ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">Telegram</Label>
                  <div>
                    <Badge variant={reminderSettings.telegram_enabled ? 'default' : 'secondary'} className="font-medium">
                      {reminderSettings.telegram_enabled ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default TelegramManagement