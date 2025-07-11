
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";

interface DashboardProps {
  onNewPrescription: () => void;
  onNavigate: (section: string) => void;
}

export function Dashboard({ onNewPrescription, onNavigate }: DashboardProps) {
  const { stats, isLoading, error } = useDashboardStats();

  return (
    <div className="min-h-screen bg-background dark:bg-[#1f2937]">
      <div className="space-y-6 p-6">
        {/* Hero Section */}
        <div 
          className="relative h-96 rounded-2xl overflow-hidden bg-gradient-to-r from-gray-800 to-gray-600"
          style={{
            backgroundImage: 'url(/lovable-uploads/65022451-c59a-498a-8a20-f98913e71add.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-6">
            <h1 className="text-5xl font-bold mb-4">Visionary Optics</h1>
            <p className="text-xl mb-8 max-w-2xl">
              Manage your glasses sales and customer information efficiently.
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={() => onNavigate("orders")}
                className="bg-white text-gray-800 hover:bg-gray-100 px-8 py-3 text-lg font-semibold rounded-full"
              >
                Siparişler
              </Button>
              <Button 
                onClick={() => onNavigate("customers")}
                className="border-white text-gray-800 bg-white hover:bg-gray-100 px-8 py-3 text-lg font-semibold rounded-full"
              >
                Müşteriler
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-3 flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="col-span-3 text-center text-red-600 p-6">
              Error loading dashboard statistics
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Siparişler</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.totalOrders}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Eş zamanlı güncellenir</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Müşteriler</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.activeCustomers}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Sipariş veren müşteriler</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Yeni Reçeteler</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.newPrescriptions}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Son 30 gün</p>
              </div>
            </>
          )}
        </div>

        {/* Copyright Footer */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-12">
          © 2024 Visionary Optics. All rights reserved.
        </div>
      </div>
    </div>
  );
}
