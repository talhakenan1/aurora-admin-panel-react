import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, DollarSign, User, Clock, Send, Plus, Edit, Trash2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useAuth } from '@/hooks/useAuth'

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
}

interface Debt {
  id: string
  customer_id: string
  amount: number
  due_date: string
  description?: string
  status: string
  created_at: string
  customers: Customer
  user_id: string
  updated_at: string
}

interface Reminder {
  id: string
  debt_id: string
  reminder_type: string
  status: string
  sent_at?: string
  created_at: string
  error_message?: string
  message_content?: string
  scheduled_date: string
  user_id: string
}

const DebtManagement: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const [newDebt, setNewDebt] = useState({
    customer_id: '',
    amount: '',
    due_date: '',
    description: ''
  })

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

      // Fetch debts with customer info
      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select(`
          *,
          customers(
            id,
            name,
            email,
            phone
          )
        `)
        .order('due_date', { ascending: true })

      if (debtsError) throw debtsError
      setDebts(debtsData || [])

      // Fetch recent reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from('reminders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (remindersError) throw remindersError
      setReminders(remindersData || [])

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

  const handleAddDebt = async () => {
    try {
      if (!newDebt.customer_id || !newDebt.amount || !newDebt.due_date) {
        toast({
          title: 'Hata',
          description: 'Lütfen tüm gerekli alanları doldurun.',
          variant: 'destructive'
        })
        return
      }

      const { error } = await supabase
        .from('debts')
        .insert({
          customer_id: newDebt.customer_id,
          amount: parseFloat(newDebt.amount),
          due_date: newDebt.due_date,
          description: newDebt.description,
          status: 'pending',
          user_id: user?.id || ''
        })

      if (error) throw error

      toast({
        title: 'Başarılı',
        description: 'Borç kaydı eklendi.'
      })

      setNewDebt({ customer_id: '', amount: '', due_date: '', description: '' })
      setIsAddDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error adding debt:', error)
      toast({
        title: 'Hata',
        description: 'Borç eklenirken bir hata oluştu.',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateDebtStatus = async (debtId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('debts')
        .update({ status })
        .eq('id', debtId)

      if (error) throw error

      toast({
        title: 'Başarılı',
        description: 'Borç durumu güncellendi.'
      })

      fetchData()
    } catch (error) {
      console.error('Error updating debt status:', error)
      toast({
        title: 'Hata',
        description: 'Borç durumu güncellenirken bir hata oluştu.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteDebt = async (debtId: string) => {
    try {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', debtId)

      if (error) throw error

      toast({
        title: 'Başarılı',
        description: 'Borç kaydı silindi.'
      })

      fetchData()
    } catch (error) {
      console.error('Error deleting debt:', error)
      toast({
        title: 'Hata',
        description: 'Borç silinirken bir hata oluştu.',
        variant: 'destructive'
      })
    }
  }

  const handleSendReminderToCustomer = async (debtId: string, customerName: string) => {
    try {
      if (!user?.id) {
        toast({
          title: 'Hata',
          description: 'Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: 'Bilgi',
        description: `${customerName} müşterisine hatırlatma gönderiliyor...`
      })

      // Send telegram message using the debt ID
      const debt = debts.find(d => d.id === debtId)
      if (!debt?.customers?.phone) {
        toast({
          title: 'Hata',
          description: 'Müşterinin telefon numarası bulunamadı.',
          variant: 'destructive'
        })
        return
      }

      const { data, error } = await supabase.functions.invoke('telegram-send-message', {
        body: { 
          phone_number: debt.customers.phone,
          debt_id: debtId
        }
      })
      
      if (error) {
        console.error('Supabase function error:', error)
        throw new Error(error.message || 'Telegram mesajı gönderilirken hata oluştu')
      }

      toast({
        title: 'Başarılı',
        description: `${customerName} müşterisine hatırlatma gönderildi.`
      })

      fetchData()
    } catch (error: any) {
      console.error('Error sending reminder:', error)
      toast({
        title: 'Hata',
        description: error?.message || 'Hatırlatma gönderilirken bir hata oluştu.',
        variant: 'destructive'
      })
    }
  }

  const handleSendReminders = async () => {
    try {
      if (!user?.id) {
        toast({
          title: 'Hata',
          description: 'Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: 'Bilgi',
        description: 'Hatırlatmalar gönderiliyor...'
      })

      const { data, error } = await supabase.functions.invoke('send-reminders', {
        body: { user_id: user.id }
      })
      
      if (error) {
        console.error('Supabase function error:', error)
        throw new Error(error.message || 'Edge function çağrısında hata oluştu')
      }

      toast({
        title: 'Başarılı',
        description: `Hatırlatmalar gönderildi. ${data?.sent || 0} başarılı, ${data?.errors || 0} hata.`
      })

      fetchData()
    } catch (error: any) {
      console.error('Error sending reminders:', error)
      toast({
        title: 'Hata',
        description: error?.message || 'Hatırlatmalar gönderilirken bir hata oluştu.',
        variant: 'destructive'
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Beklemede</Badge>
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ödendi</Badge>
      case 'overdue':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Gecikmiş</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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
                Borç Yönetimi
              </h1>
              <p className="text-muted-foreground text-lg">
                Müşteri borçlarını takip edin ve hatırlatmalar gönderin
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSendReminders} size="lg" variant="outline" className="flex items-center gap-2 hover:scale-105 transition-transform">
                <Send className="h-4 w-4" />
                Hatırlatma Gönder
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="flex items-center gap-2 hover:scale-105 transition-transform shadow-lg">
                    <Plus className="h-4 w-4" />
                    Yeni Borç
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni Borç Ekle</DialogTitle>
                    <DialogDescription>
                      Müşteri için yeni bir borç kaydı oluşturun.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customer">Müşteri</Label>
                      <Select value={newDebt.customer_id} onValueChange={(value) => setNewDebt({...newDebt, customer_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Müşteri seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount">Tutar (₺)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={newDebt.amount}
                        onChange={(e) => setNewDebt({...newDebt, amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="due_date">Vade Tarihi</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={newDebt.due_date}
                        onChange={(e) => setNewDebt({...newDebt, due_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Açıklama</Label>
                      <Textarea
                        id="description"
                        value={newDebt.description}
                        onChange={(e) => setNewDebt({...newDebt, description: e.target.value})}
                        placeholder="Borç açıklaması..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        İptal
                      </Button>
                      <Button onClick={handleAddDebt}>
                        Ekle
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Borç</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(debts.reduce((sum, debt) => debt.status === 'pending' ? sum + debt.amount : sum, 0))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ödenmemiş</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen Borçlar</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {debts.filter(debt => debt.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Beklemede</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gecikmiş Borçlar</CardTitle>
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {debts.filter(debt => debt.status === 'overdue' || (debt.status === 'pending' && new Date(debt.due_date) < new Date())).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Vade geçmiş</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Müşteri Sayısı</CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <User className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {customers.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Toplam müşteri</p>
            </CardContent>
          </Card>
        </div>

        {/* Debts Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b">
            <CardTitle className="text-xl">Borç Listesi</CardTitle>
            <CardDescription>
              Tüm müşteri borçlarını görüntüleyin ve yönetin
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left p-4 font-semibold">Müşteri</th>
                    <th className="text-left p-4 font-semibold">Tutar</th>
                    <th className="text-left p-4 font-semibold">Vade Tarihi</th>
                    <th className="text-left p-4 font-semibold">Durum</th>
                    <th className="text-left p-4 font-semibold">Açıklama</th>
                    <th className="text-left p-4 font-semibold">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((debt) => (
                    <tr key={debt.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div>
                          <div className="font-semibold text-foreground">{debt.customers.name}</div>
                          <div className="text-sm text-muted-foreground">{debt.customers.email}</div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-lg text-foreground">{formatCurrency(debt.amount)}</td>
                      <td className="p-4">
                        <div className={`font-medium ${new Date(debt.due_date) < new Date() && debt.status === 'pending' ? 'text-red-600' : 'text-foreground'}`}>
                          {formatDate(debt.due_date)}
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(debt.status)}</td>
                      <td className="p-4 max-w-xs">
                        <div className="truncate text-muted-foreground">
                          {debt.description || '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendReminderToCustomer(debt.id, debt.customers.name)}
                            className="flex items-center gap-1 hover:scale-105 transition-transform"
                          >
                            <Send className="h-3 w-3" />
                            Hatırlatma
                          </Button>
                          {debt.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateDebtStatus(debt.id, 'paid')}
                              className="hover:scale-105 transition-transform"
                            >
                              Ödendi
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:scale-105 transition-transform">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Borcu Sil</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu borç kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteDebt(debt.id)}>
                                  Sil
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {debts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium">Henüz borç kaydı bulunmuyor</p>
                  <p className="text-sm">Yeni borç ekleyerek başlayın</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Reminders */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b">
            <CardTitle className="text-xl flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              Son Hatırlatmalar
            </CardTitle>
            <CardDescription>
              Gönderilen hatırlatmaların geçmişi
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {reminders.slice(0, 10).map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant={reminder.reminder_type === 'email' ? 'default' : 'secondary'} className="font-medium">
                      {reminder.reminder_type === 'email' ? 'E-posta' : 'Telegram'}
                    </Badge>
                    <span className="text-sm text-muted-foreground font-medium">
                      {reminder.sent_at ? formatDate(reminder.sent_at) : 'Gönderilmedi'}
                    </span>
                  </div>
                  <Badge variant={reminder.status === 'sent' ? 'default' : 'destructive'} className="font-medium">
                    {reminder.status === 'sent' ? 'Gönderildi' : 'Başarısız'}
                  </Badge>
                </div>
              ))}
              {reminders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium">Henüz hatırlatma gönderilmemiş</p>
                  <p className="text-sm">Hatırlatma göndererek başlayın</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DebtManagement