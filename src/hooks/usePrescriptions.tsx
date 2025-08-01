
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface PrescriptionData {
  firstName: string;
  lastName: string;
  idNumber: string;
  email: string;
  phone: string;
  address?: string;
  productInfo: string;
  visionType: string;
  sph: string;
  cyl: string;
  axis: string;
  distanceVision: string;
  nearVision: string;
  price?: number;
  purchaseDate: Date;
  add: string;
  pd: string;
  lensType: string;
  rightEye: {
    sph: string;
    cyl: string;
    axis: string;
  };
  leftEye: {
    sph: string;
    cyl: string;
    axis: string;
  };
  rightEyeFar?: {
    sph: string;
    cyl: string;
    axis: string;
    lensType: string;
    lensColor: string;
  };
  rightEyeNear?: {
    sph: string;
    cyl: string;
    axis: string;
    lensType: string;
    lensColor: string;
  };
  leftEyeFar?: {
    sph: string;
    cyl: string;
    axis: string;
    lensType: string;
    lensColor: string;
  };
  leftEyeNear?: {
    sph: string;
    cyl: string;
    axis: string;
    lensType: string;
    lensColor: string;
  };
}

export function usePrescriptions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: prescriptions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["prescriptions", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          id,
          prescription_data,
          customers (
            name,
            email
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching prescriptions:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user,
    staleTime: 24 * 60 * 60 * 1000, // Data stays fresh for 24 hours
  });

  const addPrescription = useMutation({
    mutationFn: async (prescriptionData: PrescriptionData) => {
      if (!user) throw new Error("User not authenticated");
      
      // First, check if customer exists by ID number for this specific user
      const { data: existingCustomer, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id_number", prescriptionData.idNumber)
        .eq("user_id", user.id)
        .maybeSingle();

      if (customerError) {
        console.error("Error checking customer:", customerError);
        throw customerError;
      }

      let customerId;

      if (!existingCustomer) {
        // Create new customer for this user
        const { data: newCustomer, error: createError } = await supabase
          .from("customers")
          .insert([{
            name: `${prescriptionData.firstName} ${prescriptionData.lastName}`,
            email: prescriptionData.email,
            phone: prescriptionData.phone,
            id_number: prescriptionData.idNumber,
            address: prescriptionData.address || null,
            user_id: user.id,
          }])
          .select()
          .single();

        if (createError) {
          console.error("Error creating customer:", createError);
          throw createError;
        }
        customerId = newCustomer.id;
      } else {
        customerId = existingCustomer.id;
        
        // Update customer address if provided
        if (prescriptionData.address) {
          await supabase
            .from("customers")
            .update({ address: prescriptionData.address })
            .eq("id", customerId);
        }
      }

      // Create order for this user
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert([{
          customer_id: customerId,
          total: prescriptionData.price || 0,
          order_date: prescriptionData.purchaseDate.toISOString().split('T')[0],
          status: "new",
          user_id: user.id,
        }])
        .select()
        .single();

      if (orderError) {
        console.error("Error creating order:", orderError);
        throw orderError;
      }

      // Create prescription for this user with the new structure
      const prescriptionRecord = {
        customer_id: customerId,
        order_id: newOrder.id,
        email: prescriptionData.email,
        phone: prescriptionData.phone,
        id_number: prescriptionData.idNumber,
        price: prescriptionData.price,
        user_id: user.id,
        prescription_data: {
          firstName: prescriptionData.firstName,
          lastName: prescriptionData.lastName,
          address: prescriptionData.address,
          productInfo: prescriptionData.productInfo,
          visionType: prescriptionData.visionType,
          // Store the new prescription format
          rightEye: prescriptionData.rightEye,
          leftEye: prescriptionData.leftEye,
          rightEyeFar: prescriptionData.rightEyeFar,
          rightEyeNear: prescriptionData.rightEyeNear,
          leftEyeFar: prescriptionData.leftEyeFar,
          leftEyeNear: prescriptionData.leftEyeNear,
          add: prescriptionData.add,
          pd: prescriptionData.pd,
          lensType: prescriptionData.lensType,
          purchaseDate: prescriptionData.purchaseDate.toISOString(),
          // Keep old fields for backward compatibility but don't use them primarily
          sph: prescriptionData.sph,
          cyl: prescriptionData.cyl,
          axis: prescriptionData.axis,
          distanceVision: prescriptionData.distanceVision,
          nearVision: prescriptionData.nearVision,
        }
      };

      const { data: prescription, error: prescriptionError } = await supabase
        .from("prescriptions")
        .insert([prescriptionRecord])
        .select()
        .single();

      if (prescriptionError) {
        console.error("Error creating prescription:", prescriptionError);
        throw prescriptionError;
      }

      return prescription;
    },
    onSuccess: () => {
      // Only invalidate queries that actually need updating
      queryClient.invalidateQueries({ queryKey: ["prescriptions", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", user?.id] });
      // Dashboard charts will update automatically due to staleTime
      toast({
        title: "Success",
        description: "Prescription saved successfully",
      });
    },
    onError: (error: any) => {
      console.error("Prescription creation error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    prescriptions,
    isLoading,
    error,
    addPrescription: addPrescription.mutate,
    isAddingPrescription: addPrescription.isPending,
  };
}
