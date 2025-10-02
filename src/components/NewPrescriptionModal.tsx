
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PrescriptionForm } from "@/components/PrescriptionForm";

interface NewPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialFormData = {
  firstName: "",
  lastName: "",
  idNumber: "",
  email: "",
  phone: "",
  address: "",
  productInfo: "",
  visionType: "",
  sph: "",
  cyl: "",
  axis: "",
  distanceVision: "",
  nearVision: "",
  nearGlassPrice: "",
  farGlassPrice: "",
  nearFramePrice: "",
  farFramePrice: "",
  add: "",
  pd: "",
  lensType: "",
  rightEye: {
    sph: "",
    cyl: "",
    axis: "",
  },
  leftEye: {
    sph: "",
    cyl: "",
    axis: "",
  },
  rightEyeFar: {
    sph: "",
    cyl: "",
    axis: "",
    lensType: "",
    lensColor: "",
  },
  rightEyeNear: {
    sph: "",
    cyl: "",
    axis: "",
    lensType: "",
    lensColor: "",
  },
  leftEyeFar: {
    sph: "",
    cyl: "",
    axis: "",
    lensType: "",
    lensColor: "",
  },
  leftEyeNear: {
    sph: "",
    cyl: "",
    axis: "",
    lensType: "",
    lensColor: "",
  },
};

export function NewPrescriptionModal({ isOpen, onClose }: NewPrescriptionModalProps) {
  const [date, setDate] = useState<Date>();
  const { addPrescription, isAddingPrescription } = usePrescriptions();
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialFormData);

  // Clear form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setDate(undefined);
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEyeChange = (eye: 'rightEye' | 'leftEye', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        [field]: value
      }
    }));
  };

  const handleComplexEyeChange = (eye: 'rightEyeFar' | 'rightEyeNear' | 'leftEyeFar' | 'leftEyeNear', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        [field]: value
      }
    }));
  };

  // Auto-fill customer data when ID number is entered
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (formData.idNumber && formData.idNumber.length > 0 && user) {
        try {
          // Find customer by ID number for this specific user
          const { data: customer } = await supabase
            .from("customers")
            .select("*")
            .eq("id_number", formData.idNumber)
            .eq("user_id", user.id)
            .maybeSingle();

          if (customer) {
            // Split the name into first and last name
            const nameParts = customer.name.split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";

            // Only fill customer information, not prescription details
            setFormData(prev => ({
              ...prev,
              firstName,
              lastName,
              email: customer.email || "",
              phone: customer.phone || "",
              address: customer.address || "",
            }));
          }
        } catch (error) {
          console.error("Error fetching customer data:", error);
        }
      }
    };

    const timeoutId = setTimeout(fetchCustomerData, 500); // Debounce the API call
    return () => clearTimeout(timeoutId);
  }, [formData.idNumber, user]);

  const calculateTotalPrice = () => {
    const nearGlass = parseFloat(formData.nearGlassPrice) || 0;
    const farGlass = parseFloat(formData.farGlassPrice) || 0;
    const nearFrame = parseFloat(formData.nearFramePrice) || 0;
    const farFrame = parseFloat(formData.farFramePrice) || 0;
    return nearGlass + farGlass + nearFrame + farFrame;
  };

  const handleSave = () => {
    if (!date) {
      alert("Lütfen satın alma tarihini seçin");
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.idNumber || !formData.email) {
      alert("Lütfen tüm zorunlu alanları doldurun");
      return;
    }

    const totalPrice = calculateTotalPrice();

    addPrescription({
      ...formData,
      price: totalPrice,
      purchaseDate: date,
    });
    
    // Reset form
    setFormData(initialFormData);
    setDate(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold">Yeni Reçete</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Müşteri Bilgileri</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="idNumber">TC Kimlik Numarası *</Label>
                <Input
                  id="idNumber"
                  placeholder="TC Kimlik Numarası girin"
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange("idNumber", e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Mevcut müşteri verilerini otomatik doldurmak için TC numarasını girin</p>
              </div>
              <div>
                <Label htmlFor="firstName">İsim *</Label>
                <Input
                  id="firstName"
                  placeholder="Müşterinin ismini girin"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Soyisim *</Label>
                <Input
                  id="lastName"
                  placeholder="Müşterinin soyismini girin"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="musteri@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefon Numarası</Label>
                <Input
                  id="phone"
                  placeholder="0545297..."
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                placeholder="Müşterinin adresini girin"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Satın Alma Tarihi *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Satın alma tarihini seçin</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Ürün Bilgisi</h3>
            <div>
              <Label htmlFor="productInfo">Ürün Bilgisi</Label>
              <Textarea
                id="productInfo"
                placeholder="Ürün detaylarını girin (örn: Gözlük satın alındı)"
                value={formData.productInfo}
                onChange={(e) => handleInputChange("productInfo", e.target.value)}
              />
            </div>
          </div>

          {/* Price Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Fiyat Bilgisi</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="nearGlassPrice">Yakın Cam Fiyatı</Label>
                <Input
                  id="nearGlassPrice"
                  type="number"
                  placeholder="0.00"
                  value={formData.nearGlassPrice}
                  onChange={(e) => handleInputChange("nearGlassPrice", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="farGlassPrice">Uzak Cam Fiyatı</Label>
                <Input
                  id="farGlassPrice"
                  type="number"
                  placeholder="0.00"
                  value={formData.farGlassPrice}
                  onChange={(e) => handleInputChange("farGlassPrice", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="nearFramePrice">Yakın Çerçeve Fiyatı</Label>
                <Input
                  id="nearFramePrice"
                  type="number"
                  placeholder="0.00"
                  value={formData.nearFramePrice}
                  onChange={(e) => handleInputChange("nearFramePrice", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="farFramePrice">Uzak Çerçeve Fiyatı</Label>
                <Input
                  id="farFramePrice"
                  type="number"
                  placeholder="0.00"
                  value={formData.farFramePrice}
                  onChange={(e) => handleInputChange("farFramePrice", e.target.value)}
                />
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Toplam Fiyat:</span>
                <span className="text-xl font-bold">{calculateTotalPrice().toFixed(2)} ₺</span>
              </div>
            </div>
          </div>

          {/* Prescription Details using new form */}
          <PrescriptionForm 
            formData={formData}
            onChange={handleInputChange}
            onEyeChange={handleEyeChange}
            onComplexEyeChange={handleComplexEyeChange}
          />

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              İptal
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isAddingPrescription}
              className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto"
            >
              {isAddingPrescription ? "Kaydediliyor..." : "Reçeteyi Kaydet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
