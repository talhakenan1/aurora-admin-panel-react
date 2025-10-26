
import { Button } from "@/components/ui/button";
import { User, Sun, Moon, Bell, HelpCircle, Headphones, LogOut, Monitor, Send, CheckCircle2, XCircle, Copy, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { HelpModal } from "@/components/HelpModal";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTelegramVerification } from "@/hooks/useTelegramVerification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface SettingsProps {
  onPersonalInfo: () => void;
}

export function Settings({ onPersonalInfo }: SettingsProps) {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const { verificationCode, isRegistered, isLoading: telegramLoading, refreshCode, deactivate } = useTelegramVerification();
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const saved = localStorage.getItem('emailNotifications');
    return saved ? JSON.parse(saved) : true;
  });
  const [pushNotifications, setPushNotifications] = useState(() => {
    const saved = localStorage.getItem('pushNotifications');
    return saved ? JSON.parse(saved) : false;
  });
  const [orderUpdates, setOrderUpdates] = useState(() => {
    const saved = localStorage.getItem('orderUpdates');
    return saved ? JSON.parse(saved) : true;
  });
  const [marketingEmails, setMarketingEmails] = useState(() => {
    const saved = localStorage.getItem('marketingEmails');
    return saved ? JSON.parse(saved) : false;
  });
  const { signOut } = useAuth();

  useEffect(() => {
    localStorage.setItem('emailNotifications', JSON.stringify(emailNotifications));
  }, [emailNotifications]);

  useEffect(() => {
    localStorage.setItem('pushNotifications', JSON.stringify(pushNotifications));
  }, [pushNotifications]);

  useEffect(() => {
    localStorage.setItem('orderUpdates', JSON.stringify(orderUpdates));
  }, [orderUpdates]);

  useEffect(() => {
    localStorage.setItem('marketingEmails', JSON.stringify(marketingEmails));
  }, [marketingEmails]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kopyalandı!');
  };

  const botLink = 'https://t.me/PhoneReminderBot';

  return (
    <div className="min-h-screen bg-background dark:bg-[#4f5450]">
      <div className="space-y-8 p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white">Ayarlar</h1>

        {/* Account Section */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">Hesap</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 space-y-0">
            <Button
              variant="ghost"
              className="w-full justify-start p-4 sm:p-6 h-auto border-b dark:border-gray-700 rounded-none text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={onPersonalInfo}
            >
              <User className="w-5 h-5 mr-3 sm:mr-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Kişisel Bilgiler</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Kişisel bilgilerinizi yönetin</div>
              </div>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start p-4 sm:p-6 h-auto rounded-none text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5 mr-3 sm:mr-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Çıkış Yap</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Hesabınızdan çıkış yapın</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Display Section */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">Görünüm</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Sun className="w-5 h-5 text-foreground dark:text-white" />
                <span className="font-medium text-foreground dark:text-white">Tema</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => handleThemeChange("light")}
                  className={`flex items-center justify-center space-x-2 h-auto py-3 ${
                    theme === "light" 
                      ? "bg-blue-500 text-white hover:bg-blue-600" 
                      : "text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Aydınlık</span>
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => handleThemeChange("dark")}
                  className={`flex items-center justify-center space-x-2 h-auto py-3 ${
                    theme === "dark" 
                      ? "bg-blue-500 text-white hover:bg-blue-600" 
                      : "text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Karanlık</span>
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  onClick={() => handleThemeChange("system")}
                  className={`flex items-center justify-center space-x-2 h-auto py-3 ${
                    theme === "system" 
                      ? "bg-blue-500 text-white hover:bg-blue-600" 
                      : "text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>Sistem</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Telegram Notifications Section */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">Telegram Bildirimleri</h2>
          <Card className="bg-white dark:bg-gray-800 border dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-foreground dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5" />
                Otomatik Borç Bildirimleri
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Telegram üzerinden otomatik bildirim almak için hesabınızı kaydedin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {telegramLoading ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">Yükleniyor...</div>
              ) : isRegistered ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Telegram hesabınız aktif
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Gecikmiş borçlar için otomatik bildirimler alacaksınız
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={deactivate}
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Bildirimleri Deaktif Et
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Nasıl Kaydolunur?
                    </h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      <li>Aşağıdaki bot linkini açın</li>
                      <li>Telegram botuna <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">/start</code> yazın</li>
                      <li>Ardından <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">/register_owner [kod]</code> komutunu kullanın</li>
                    </ol>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-foreground dark:text-white">
                        Bot Linki
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={botLink}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white"
                        />
                        <Button
                          onClick={() => copyToClipboard(botLink)}
                          variant="outline"
                          size="sm"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground dark:text-white">
                        Doğrulama Kodu
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={verificationCode}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-2xl font-mono font-bold text-center text-gray-900 dark:text-white tracking-wider"
                        />
                        <Button
                          onClick={() => copyToClipboard(verificationCode)}
                          variant="outline"
                          size="sm"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={refreshCode}
                          variant="outline"
                          size="sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Kod 24 saat geçerlidir
                      </p>
                    </div>

                    <Button
                      onClick={() => window.open(botLink, '_blank')}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Telegram Botunu Aç
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notifications Section */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">Bildirim Tercihleri</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-4 sm:p-6">
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Bell className="w-5 h-5 text-foreground dark:text-white" />
                <span className="font-medium text-foreground dark:text-white">Bildirimler</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications" className="text-base font-medium text-foreground dark:text-white">
                      Email Bildirimleri
                    </Label>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Email ile bildirim alın
                    </div>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                    className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-600"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications" className="text-base font-medium text-foreground dark:text-white">
                      Anlık Bildirimler
                    </Label>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Tarayıcıda anlık bildirim alın
                    </div>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                    className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-600"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="order-updates" className="text-base font-medium text-foreground dark:text-white">
                      Sipariş Güncellemesi
                    </Label>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Sipariş durumu değişikliklerinden haberdar olun
                    </div>
                  </div>
                  <Switch
                    id="order-updates"
                    checked={orderUpdates}
                    onCheckedChange={setOrderUpdates}
                    className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-600"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketing-emails" className="text-base font-medium text-foreground dark:text-white">
                      Pazarlama Mailleri
                    </Label>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Promosyon emaillerini ve güncellemeleri alın
                    </div>
                  </div>
                  <Switch
                    id="marketing-emails"
                    checked={marketingEmails}
                    onCheckedChange={setMarketingEmails}
                    className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help & Support Section */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">Yardım ve Destek</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 space-y-0">
            <Button
              variant="ghost"
              className="w-full justify-start p-4 sm:p-6 h-auto border-b dark:border-gray-700 rounded-none text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => setIsHelpModalOpen(true)}
            >
              <HelpCircle className="w-5 h-5 mr-3 sm:mr-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Yardım</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Kullanıcı kılavuzunu ve dokümantasyonu görüntüleyin</div>
              </div>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start p-4 sm:p-6 h-auto rounded-none text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Headphones className="w-5 h-5 mr-3 sm:mr-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Destek</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Müşteri desteğiyle iletişime geçin</div>
              </div>
            </Button>
          </div>
        </div>

        <HelpModal 
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
        />
      </div>
    </div>
  );
}
