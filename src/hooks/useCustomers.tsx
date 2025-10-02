
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function useCustomers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: customers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customers", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, phone, id_number, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching customers:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user,
    staleTime: 24 * 60 * 60 * 1000, // Data stays fresh for 24 hours
  });

  const addCustomer = useMutation({
    mutationFn: async (customer: { name: string; email: string; phone?: string; id_number: string }) => {
      if (!user) throw new Error("User not authenticated");
      
      // Basic input validation
      if (!customer.name.trim()) {
        throw new Error("Name is required");
      }
      
      if (!customer.email.trim()) {
        throw new Error("Email is required");
      }
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email)) {
        throw new Error("Please enter a valid email address");
      }
      
      if (!customer.id_number.trim()) {
        throw new Error("ID number is required");
      }
      
      // Turkish phone number validation (optional field)
      if (customer.phone && customer.phone.trim()) {
        const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
        if (!phoneRegex.test(customer.phone.replace(/\s/g, ''))) {
          throw new Error("Please enter a valid Turkish phone number (e.g., 05XX XXX XX XX)");
        }
      }
      
      // Check if customer with same ID number already exists for this user
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("id_number", customer.id_number)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingCustomer) {
        throw new Error("There is already a customer with this ID number");
      }
      
      const { data, error } = await supabase
        .from("customers")
        .insert([{ ...customer, user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error("Error adding customer:", error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", user?.id] });
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
    },
    onError: (error: any) => {
      console.error("Customer creation error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (customerId: string) => {
      if (!user) throw new Error("User not authenticated");
      
      // First, delete all orders associated with this customer
      const { error: ordersError } = await supabase
        .from("orders")
        .delete()
        .eq("customer_id", customerId)
        .eq("user_id", user.id);
      
      if (ordersError) {
        console.error("Error deleting customer orders:", ordersError);
        throw ordersError;
      }
      
      // Then, delete all prescriptions associated with this customer
      const { error: prescriptionsError } = await supabase
        .from("prescriptions")
        .delete()
        .eq("customer_id", customerId)
        .eq("user_id", user.id);
      
      if (prescriptionsError) {
        console.error("Error deleting customer prescriptions:", prescriptionsError);
        throw prescriptionsError;
      }
      
      // Finally, delete the customer
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting customer:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["orders", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", user?.id] });
      toast({
        title: "Başarılı",
        description: "Müşteri ve ilişkili tüm veriler başarıyla silindi",
      });
    },
    onError: (error: any) => {
      console.error("Customer deletion error:", error);
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    customers,
    isLoading,
    error,
    addCustomer: addCustomer.mutate,
    isAddingCustomer: addCustomer.isPending,
    deleteCustomer: deleteCustomer.mutate,
    isDeletingCustomer: deleteCustomer.isPending,
  };
}
