
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrders } from "@/hooks/useOrders";

interface OrderDetailsModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  const { updateOrderStatus, isUpdatingOrder, deleteOrder, isDeletingOrder } = useOrders();

  const handleReturnOrder = () => {
    updateOrderStatus({ id: order.id, status: "returned" });
    onClose();
  };

  const handleDeleteOrder = () => {
    if (window.confirm("Bu siparişi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
      deleteOrder(order.id);
      onClose();
    }
  };

  const getOrderStatus = (orderDate: string) => {
    const today = new Date();
    const orderDateTime = new Date(orderDate);
    const diffInDays = Math.floor((today.getTime() - orderDateTime.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays <= 7) {
      return "new";
    } else {
      return "shipped";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "shipped": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "returned": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new": return "Yeni";
      case "shipped": return "Teslim";
      case "returned": return "İade";
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const displayStatus = order.status === "returned" ? "returned" : getOrderStatus(order.order_date);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl mx-4 sm:mx-0 bg-background dark:bg-[#4f5450]">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground dark:text-white">Sipariş Detayları</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground dark:text-white">Sipariş Bilgisi</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Sipariş Numarası:</span>
                  <p className="text-gray-900 dark:text-white">#{order.id.slice(0, 8)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Sipariş Tarihi:</span>
                  <p className="text-gray-900 dark:text-white">{formatDate(order.order_date)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Durum:</span>
                  <div className="mt-1">
                    <Badge className={getStatusColor(displayStatus)}>
                      {getStatusText(displayStatus)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Toplam:</span>
                  <p className="text-gray-900 dark:text-white text-lg font-semibold">{formatCurrency(Number(order.total))}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground dark:text-white">Müşteri Bilgisi</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">İsim:</span>
                  <p className="text-gray-900 dark:text-white">{order.customers?.name || 'Bilinmiyor'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Müşteri TC Numarası:</span>
                  <p className="text-gray-900 dark:text-white">{order.customers?.id_number || 'Yok'}</p>
                </div>
                {order.customers?.email && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                    <p className="text-gray-900 dark:text-white">{order.customers.email}</p>
                  </div>
                )}
                {order.customers?.phone && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Telefon:</span>
                    <p className="text-gray-900 dark:text-white">{order.customers.phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground dark:text-white">Sipariş Zaman Çizelgesi</h3>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Sipariş {formatDate(order.order_date)} tarihinde verildi
              </div>
              {displayStatus === "shipped" && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Sipariş teslim edildi (7 günden eski)
                </div>
              )}
              {displayStatus === "returned" && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                  Sipariş iade edildi
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 pt-4 border-t dark:border-gray-600">
            <Button 
              onClick={handleDeleteOrder}
              disabled={isDeletingOrder}
              variant="destructive"
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              {isDeletingOrder ? "Siliniyor..." : "Siparişi Sil"}
            </Button>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto dark:border-gray-600 dark:text-white dark:hover:bg-gray-600">
                Kapat
              </Button>
              {displayStatus !== "returned" && (
                <Button 
                  onClick={handleReturnOrder}
                  disabled={isUpdatingOrder}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  {isUpdatingOrder ? "İşleniyor..." : "İade Olarak İşaretle"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
