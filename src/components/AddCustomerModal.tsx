
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomers } from "@/hooks/useCustomers";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddCustomerModal({ isOpen, onClose }: AddCustomerModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idNumber: "",
  });
  const { addCustomer, isAddingCustomer } = useCustomers();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.idNumber.trim()) {
      alert("ID Number is required");
      return;
    }
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    addCustomer({
      name: fullName,
      email: formData.email,
      phone: formData.phone,
      id_number: formData.idNumber,
    });
    setFormData({ firstName: "", lastName: "", email: "", phone: "", idNumber: "" });
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold">Add New Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="idNumber">ID Number *</Label>
            <Input
              id="idNumber"
              value={formData.idNumber}
              onChange={(e) => handleInputChange("idNumber", e.target.value)}
              required
              className="mt-1"
              placeholder="Enter customer's ID number"
            />
          </div>

          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              required
              className="mt-1"
              placeholder="Customer's first name"
            />
          </div>

          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              required
              className="mt-1"
              placeholder="Customer's last name"
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              className="mt-1"
              placeholder="customer@email.com"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              className="mt-1"
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isAddingCustomer}
              className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto"
            >
              {isAddingCustomer ? "Adding..." : "Add Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
