
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background dark:bg-[#4f5450]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground dark:text-white">Yardım ve Dokümantasyon</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="getting-started" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-700">
            <TabsTrigger value="getting-started" className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-white">Başlangıç</TabsTrigger>
            <TabsTrigger value="prescriptions" className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-white">Reçeteler</TabsTrigger>
            <TabsTrigger value="customers" className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-white">Müşteriler</TabsTrigger>
            <TabsTrigger value="orders" className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-white">Siparişler</TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started" className="space-y-4 mt-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-foreground dark:text-white">Melis Optik'e Hoş Geldiniz</h3>
              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <p>
                  Bu uygulama, optik işletmenizi verimli bir şekilde yönetmenize yardımcı olur. Yapabilecekleriniz:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Müşteri bilgilerini ve reçetelerini yönetme</li>
                  <li>Sipariş oluşturma ve takip etme</li>
                  <li>Dashboard'da iş analitiği görüntüleme</li>
                  <li>Ayarlar üzerinden deneyiminizi özelleştirme</li>
                </ul>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-foreground dark:text-white">Hızlı Başlangıç Rehberi</h3>
              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <div>
                  <h4 className="font-medium text-foreground dark:text-white">1. İlk Müşterinizi Ekleyin</h4>
                  <p>Müşteriler sayfasına gidin ve başlamak için "Müşteri Ekle" butonuna tıklayın.</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground dark:text-white">2. Reçete Oluşturun</h4>
                  <p>Müşterileriniz için reçete oluşturmak üzere "Yeni Reçete" butonunu kullanın.</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground dark:text-white">3. Siparişleri Takip Edin</h4>
                  <p>Siparişler sayfasından tüm siparişleri ve durumlarını izleyin.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-4 mt-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-foreground dark:text-white">Reçete Oluşturma</h3>
              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <p>Yeni bir reçete oluşturmak için:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>"Yeni Reçete" butonuna tıklayın</li>
                  <li>Bir müşteri seçin veya yeni müşteri oluşturun</li>
                  <li>Lens ölçümleri dahil reçete detaylarını doldurun</li>
                  <li>Özel notlar veya gereksinimler ekleyin</li>
                  <li>Fiyatı belirleyin ve kaydedin</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4 mt-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-foreground dark:text-white">Müşteri Yönetimi</h3>
              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <p>Müşteri yönetimi özellikleri:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>İletişim bilgileriyle yeni müşteri ekleme</li>
                  <li>Müşteri sipariş geçmişini görüntüleme</li>
                  <li>Müşterileri isim, e-posta veya ID ile arama</li>
                  <li>Her müşteri için reçete geçmişini takip etme</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 mt-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-foreground dark:text-white">Sipariş Yönetimi</h3>
              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <p>Sipariş takibi şunları içerir:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Yeni:</strong> Son 7 gün içinde verilen siparişler</li>
                  <li><strong>Gönderildi:</strong> 7 günden eski siparişler</li>
                  <li><strong>İade:</strong> İade olarak işaretlenen siparişler</li>
                </ul>
                <p>Siparişleri duruma göre filtreleyebilir ve müşteri adı veya sipariş ID'sine göre arama yapabilirsiniz.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t dark:border-gray-600">
          <Button onClick={onClose} className="bg-blue-500 hover:bg-blue-600 text-white">
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
