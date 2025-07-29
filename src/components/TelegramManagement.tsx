import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Users, Settings, Send, Copy, Check } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Telegram Yönetimi</h1>
          <p className="text-muted-foreground">Telegram bot kullanıcılarını yönetin ve ayarları yapılandırın</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBroadcastDialogOpen} onOpenChange={setIsBroadcastDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
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
              <Button className="flex items-center gap-2">
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

      {/* Bot Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Bot Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">@{botUsername}</h3>
                <p className="text-sm text-gray-500">Müşteriler bu botu kullanarak kayıt olabilir</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyBotLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Kopyalandı' : 'Linki Kopyala'}
                </Button>
                <Button asChild>
                  <a href={botLink} target="_blank" rel="noopener noreferrer">
                    Bot'u Aç
                  </a>
                </Button>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p><strong>Kullanım:</strong> Müşteriler botu başlatıp <code>/register</code> komutu ile kayıt olabilir.</p>
              <p><strong>Komutlar:</strong> /start, /register, /help, /status</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{telegramUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Kullanıcı</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {telegramUsers.filter(user => user.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pasif Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {telegramUsers.filter(user => !user.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Telegram Kullanıcıları</CardTitle>
          <CardDescription>
            Bot'a kayıt olan kullanıcıları görüntüleyin ve yönetin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Müşteri</th>
                  <th className="text-left p-2">Telegram Bilgileri</th>
                  <th className="text-left p-2">Durum</th>
                  <th className="text-left p-2">Kayıt Tarihi</th>
                  <th className="text-left p-2">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {telegramUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{user.customers.name}</div>
                        <div className="text-sm text-gray-500">{user.customers.email}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div>
                        <div className="font-medium">
                          {user.telegram_username ? `@${user.telegram_username}` : 'Kullanıcı adı yok'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.telegram_first_name} {user.telegram_last_name}
                        </div>
                        <div className="text-xs text-gray-400">
                          Chat ID: {user.telegram_chat_id}
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </td>
                    <td className="p-2">{formatDate(user.created_at)}</td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                      >
                        {user.is_active ? 'Pasif Et' : 'Aktif Et'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {telegramUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Henüz Telegram kullanıcısı bulunmuyor.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Settings */}
      {reminderSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Mevcut Ayarlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Hatırlatma Saati</Label>
                <p className="text-lg font-medium">{reminderSettings.reminder_time}</p>
              </div>
              <div>
                <Label>Hatırlatma Günleri</Label>
                <div className="flex gap-1 mt-1">
                  {reminderSettings.reminder_days_before.map(day => (
                    <Badge key={day} variant="outline">{day} gün</Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>E-posta</Label>
                <Badge variant={reminderSettings.email_enabled ? 'default' : 'secondary'}>
                  {reminderSettings.email_enabled ? 'Aktif' : 'Pasif'}
                </Badge>
              </div>
              <div>
                <Label>Telegram</Label>
                <Badge variant={reminderSettings.telegram_enabled ? 'default' : 'secondary'}>
                  {reminderSettings.telegram_enabled ? 'Aktif' : 'Pasif'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TelegramManagement