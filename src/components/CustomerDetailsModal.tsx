
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCustomers } from "@/hooks/useCustomers";

interface CustomerDetailsModalProps {
  customer: any;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerDetailsModal({ customer, isOpen, onClose }: CustomerDetailsModalProps) {
  const { user } = useAuth();
  const { deleteCustomer, isDeletingCustomer } = useCustomers();
  
  const handleDeleteCustomer = () => {
    if (window.confirm(
      "Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem müşterinin tüm siparişlerini ve reçetelerini de silecektir ve geri alınamaz."
    )) {
      deleteCustomer(customer.id);
      onClose();
    }
  };
  
  const { data: customerOrders = [], isLoading } = useQuery({
    queryKey: ["customer-orders", customer.id, user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      console.log("Fetching orders for customer:", customer.id, "and user:", user.id);
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          prescriptions (
            prescription_data,
            notes
          )
        `)
        .eq("customer_id", customer.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching customer orders:", error);
        throw error;
      }
      
      console.log("Fetched customer orders:", data);
      return data || [];
    },
    enabled: isOpen && !!user,
  });

  const getOrderStatus = (orderDate: string, status: string) => {
    if (status === "returned") return "returned";
    
    const today = new Date();
    const orderDateTime = new Date(orderDate);
    const diffInDays = Math.floor((today.getTime() - orderDateTime.getTime()) / (1000 * 60 * 60 * 24));
    
    return diffInDays <= 7 ? "new" : "shipped";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800";
      case "shipped": return "bg-green-100 text-green-800";
      case "returned": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Müşteri Detayları</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Müşteri Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">İsim:</span>
                <p className="text-gray-900 dark:text-gray-100">{customer.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                <p className="text-gray-900 dark:text-gray-100">{customer.email}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Telefon Numarası:</span>
                <p className="text-gray-900 dark:text-gray-100">{customer.phone || 'Belirtilmemiş'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">TC Kimlik Numarası:</span>
                <p className="text-gray-900 dark:text-gray-100">{customer.id_number || 'Belirtilmemiş'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Kayıt Tarihi:</span>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(customer.created_at)}</p>
              </div>
              {customer.address && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Adres:</span>
                  <p className="text-gray-900 dark:text-gray-100">{customer.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order History */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Sipariş Geçmişi</h3>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : customerOrders.length > 0 ? (
              <div className="space-y-4">
                {customerOrders.map((order) => {
                  const orderStatus = getOrderStatus(order.order_date, order.status);
                  return (
                    <div key={order.id} className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">Sipariş #{order.id.slice(0, 8)}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Tarih: {formatDate(order.order_date)}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(orderStatus)}>
                            {getStatusText(orderStatus)}
                          </Badge>
                          <p className="text-lg font-semibold mt-1 dark:text-gray-100">{formatCurrency(Number(order.total))}</p>
                        </div>
                      </div>
                      
                      {order.prescriptions && order.prescriptions.length > 0 && (
                        <div className="mt-3 pt-3 border-t dark:border-gray-700">
                          <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Reçete Detayları:</h5>
                          {order.prescriptions.map((prescription: any, index: number) => (
                            <div key={index} className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                              {prescription.prescription_data?.productInfo && (
                                <p><span className="font-medium">Ürün:</span> {prescription.prescription_data.productInfo}</p>
                              )}
                              {prescription.prescription_data?.lensType && (
                                <p><span className="font-medium">Lens Tipi:</span> {prescription.prescription_data.lensType}</p>
                              )}
                              
                              {/* New Vision Details Grid - prioritize new format */}
                              {prescription.prescription_data?.rightEyeFar || prescription.prescription_data?.rightEyeNear || prescription.prescription_data?.leftEyeFar || prescription.prescription_data?.leftEyeNear ? (
                                <div className="space-y-3 mt-2">
                                  {/* Far Vision */}
                                  {(prescription.prescription_data?.rightEyeFar || prescription.prescription_data?.leftEyeFar) && (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                      <h6 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Uzak Görüş</h6>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <h6 className="font-medium text-gray-600 dark:text-gray-400">Sağ Göz</h6>
                                          {prescription.prescription_data?.rightEyeFar?.sph && (
                                            <p><span className="font-medium">SPH:</span> {prescription.prescription_data.rightEyeFar.sph}</p>
                                          )}
                                          {prescription.prescription_data?.rightEyeFar?.cyl && (
                                            <p><span className="font-medium">CYL:</span> {prescription.prescription_data.rightEyeFar.cyl}</p>
                                          )}
                                          {prescription.prescription_data?.rightEyeFar?.axis && (
                                            <p><span className="font-medium">AXIS:</span> {prescription.prescription_data.rightEyeFar.axis}</p>
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          <h6 className="font-medium text-gray-600 dark:text-gray-400">Sol Göz</h6>
                                          {prescription.prescription_data?.leftEyeFar?.sph && (
                                            <p><span className="font-medium">SPH:</span> {prescription.prescription_data.leftEyeFar.sph}</p>
                                          )}
                                          {prescription.prescription_data?.leftEyeFar?.cyl && (
                                            <p><span className="font-medium">CYL:</span> {prescription.prescription_data.leftEyeFar.cyl}</p>
                                          )}
                                          {prescription.prescription_data?.leftEyeFar?.axis && (
                                            <p><span className="font-medium">AXIS:</span> {prescription.prescription_data.leftEyeFar.axis}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Near Vision */}
                                  {(prescription.prescription_data?.rightEyeNear || prescription.prescription_data?.leftEyeNear) && (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                      <h6 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Yakın Görüş</h6>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <h6 className="font-medium text-gray-600 dark:text-gray-400">Sağ Göz</h6>
                                          {prescription.prescription_data?.rightEyeNear?.sph && (
                                            <p><span className="font-medium">SPH:</span> {prescription.prescription_data.rightEyeNear.sph}</p>
                                          )}
                                          {prescription.prescription_data?.rightEyeNear?.cyl && (
                                            <p><span className="font-medium">CYL:</span> {prescription.prescription_data.rightEyeNear.cyl}</p>
                                          )}
                                          {prescription.prescription_data?.rightEyeNear?.axis && (
                                            <p><span className="font-medium">AXIS:</span> {prescription.prescription_data.rightEyeNear.axis}</p>
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          <h6 className="font-medium text-gray-600 dark:text-gray-400">Sol Göz</h6>
                                          {prescription.prescription_data?.leftEyeNear?.sph && (
                                            <p><span className="font-medium">SPH:</span> {prescription.prescription_data.leftEyeNear.sph}</p>
                                          )}
                                          {prescription.prescription_data?.leftEyeNear?.cyl && (
                                            <p><span className="font-medium">CYL:</span> {prescription.prescription_data.leftEyeNear.cyl}</p>
                                          )}
                                          {prescription.prescription_data?.leftEyeNear?.axis && (
                                            <p><span className="font-medium">AXIS:</span> {prescription.prescription_data.leftEyeNear.axis}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* ADD and PD - Global values */}
                                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                    <div className="grid grid-cols-2 gap-4">
                                      {prescription.prescription_data?.add && (
                                        <div>
                                          <span className="font-medium text-gray-700 dark:text-gray-300">ADD:</span>
                                          <p className="text-gray-900 dark:text-gray-100">{prescription.prescription_data.add}</p>
                                        </div>
                                      )}
                                      {prescription.prescription_data?.pd && (
                                        <div>
                                          <span className="font-medium text-gray-700 dark:text-gray-300">PD:</span>
                                          <p className="text-gray-900 dark:text-gray-100">{prescription.prescription_data.pd}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : prescription.prescription_data?.rightEye || prescription.prescription_data?.leftEye ? (
                                <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                  <div className="space-y-1">
                                    <h6 className="font-medium text-gray-700 dark:text-gray-300">Sağ Göz</h6>
                                    {prescription.prescription_data?.rightEye?.sph && (
                                      <p><span className="font-medium">SPH:</span> {prescription.prescription_data.rightEye.sph}</p>
                                    )}
                                    {prescription.prescription_data?.rightEye?.cyl && (
                                      <p><span className="font-medium">CYL:</span> {prescription.prescription_data.rightEye.cyl}</p>
                                    )}
                                    {prescription.prescription_data?.rightEye?.axis && (
                                      <p><span className="font-medium">AXIS:</span> {prescription.prescription_data.rightEye.axis}</p>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <h6 className="font-medium text-gray-700 dark:text-gray-300">Sol Göz</h6>
                                    {prescription.prescription_data?.leftEye?.sph && (
                                      <p><span className="font-medium">SPH:</span> {prescription.prescription_data.leftEye.sph}</p>
                                    )}
                                    {prescription.prescription_data?.leftEye?.cyl && (
                                      <p><span className="font-medium">CYL:</span> {prescription.prescription_data.leftEye.cyl}</p>
                                    )}
                                    {prescription.prescription_data?.leftEye?.axis && (
                                      <p><span className="font-medium">AXIS:</span> {prescription.prescription_data.leftEye.axis}</p>
                                    )}
                                  </div>
                                  {/* ADD and PD for simple format */}
                                  {(prescription.prescription_data?.add || prescription.prescription_data?.pd) && (
                                    <div className="col-span-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                      <div className="grid grid-cols-2 gap-4">
                                        {prescription.prescription_data?.add && (
                                          <div>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">ADD:</span>
                                            <p className="text-gray-900 dark:text-gray-100">{prescription.prescription_data.add}</p>
                                          </div>
                                        )}
                                        {prescription.prescription_data?.pd && (
                                          <div>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">PD:</span>
                                            <p className="text-gray-900 dark:text-gray-100">{prescription.prescription_data.pd}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // Fallback to old format if new format not available
                                <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                  <div className="space-y-1">
                                    {prescription.prescription_data?.sph && (
                                      <p><span className="font-medium">SPH:</span> {prescription.prescription_data.sph}</p>
                                    )}
                                    {prescription.prescription_data?.cyl && (
                                      <p><span className="font-medium">CYL:</span> {prescription.prescription_data.cyl}</p>
                                    )}
                                    {prescription.prescription_data?.axis && (
                                      <p><span className="font-medium">Axis:</span> {prescription.prescription_data.axis}</p>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    {prescription.prescription_data?.distanceVision && (
                                      <p><span className="font-medium">Uzak Görüş:</span> {prescription.prescription_data.distanceVision}</p>
                                    )}
                                    {prescription.prescription_data?.nearVision && (
                                      <p><span className="font-medium">Yakın Görüş:</span> {prescription.prescription_data.nearVision}</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {prescription.notes && (
                                <p><span className="font-medium">Notlar:</span> {prescription.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Bu müşteri için sipariş bulunamadı.
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t dark:border-gray-700">
            <Button 
              onClick={handleDeleteCustomer}
              disabled={isDeletingCustomer}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingCustomer ? "Siliniyor..." : "Müşteriyi Sil"}
            </Button>
            <Button onClick={onClose}>Kapat</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
