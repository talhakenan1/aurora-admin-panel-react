
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function useOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_date,
          status,
          total,
          customers (
            name,
            email
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user,
    staleTime: 24 * 60 * 60 * 1000, // Data stays fresh for 24 hours
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating order:", error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", user?.id] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error: any) => {
      console.error("Order update error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (orderId: string) => {
      if (!user) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting order:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      toast({
        title: "Başarılı",
        description: "Sipariş başarıyla silindi",
      });
    },
    onError: (error: any) => {
      console.error("Order deletion error:", error);
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    orders,
    isLoading,
    error,
    updateOrderStatus: updateOrderStatus.mutate,
    isUpdatingOrder: updateOrderStatus.isPending,
    deleteOrder: deleteOrder.mutate,
    isDeletingOrder: deleteOrder.isPending,
  };
}
