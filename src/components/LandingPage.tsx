
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Users, FileText, BarChart3, Shield, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set(["hero"]));
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const features = [
    {
      icon: <Eye className="w-8 h-8 text-black" />,
      title: "Reçete Yönetimi",
      description: "Müşterilerinizin gözlük reçetelerini detaylı bir şekilde kaydedin ve takip edin. Sağ ve sol göz değerlerini ayrı ayrı girebilir, cam tipi ve rengini belirleyebilirsiniz."
    },
    {
      icon: <Users className="w-8 h-8 text-black" />,
      title: "Müşteri Veritabanı",
      description: "Müşteri bilgilerini güvenli bir şekilde saklayın. TC kimlik numarası ile hızlı arama yapın ve geçmiş siparişlere kolayca ulaşın."
    },
    {
      icon: <FileText className="w-8 h-8 text-black" />,
      title: "Sipariş Takibi",
      description: "Siparişleri durumlarına göre sınıflandırın: Yeni, Teslim edildi, İade. Toplam ciroyu otomatik hesaplayın ve izleyin."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-black" />,
      title: "Analiz ve Raporlama",
      description: "İş performansınızı anlık olarak takip edin. Toplam sipariş sayısı, aktif müşteri sayısı ve yeni reçeteler gibi önemli metrikleri görün."
    },
    {
      icon: <Shield className="w-8 h-8 text-black" />,
      title: "Güvenli Veri Saklama",
      description: "Tüm müşteri bilgileri ve reçeteler güvenli bulut teknolojisi ile korunur. Verileriniz sadece size ait ve tamamen gizlidir."
    },
    {
      icon: <Clock className="w-8 h-8 text-black" />,
      title: "Gerçek Zamanlı Güncelleme",
      description: "Sistem anlık olarak güncellenir. Yeni siparişler ve müşteri bilgileri hemen dashboard'da görünür."
    }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, entry.target.id]));
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -10% 0px"
      }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-gradient-subtle dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section 
        id="hero"
        ref={(el) => sectionRefs.current["hero"] = el}
        className={`min-h-screen flex items-center justify-center px-4 transition-all duration-1000 ${
          visibleSections.has("hero") 
            ? "opacity-100 transform translate-y-0" 
            : "opacity-0 transform translate-y-10"
        }`}
      >
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Visionary Optics
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            İşletmeniz için özel olarak tasarlanmış profesyonel yönetim sistemi. 
            Reçetelerden siparişlere, müşteri takibinden analizlere kadar tüm ihtiyaçlarınızı karşılar.
          </p>
          <Button 
            onClick={onGetStarted}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg"
          >
            Hemen Başlayın
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section 
        id="features"
        ref={(el) => sectionRefs.current["features"] = el}
        className={`min-h-screen flex items-center px-4 transition-all duration-1000 ${
          visibleSections.has("features") 
            ? "opacity-100 transform scale-100" 
            : "opacity-0 transform scale-95"
        }`}
      >
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className={`card-modern hover-glow transition-all duration-700 ${
                  visibleSections.has("features")
                    ? "opacity-100 transform translate-y-0"
                    : "opacity-0 transform translate-y-10"
                }`}
                style={{
                  transitionDelay: visibleSections.has("features") ? `${index * 0.15}s` : '0s'
                }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-gradient-primary/10 hover-scale">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section 
        id="benefits"
        ref={(el) => sectionRefs.current["benefits"] = el}
        className={`min-h-screen flex items-center px-4 transition-all duration-1000 ${
          visibleSections.has("benefits") 
            ? "opacity-100 transform translate-y-0" 
            : "opacity-0 transform translate-y-10"
        }`}
      >
        <div className="container mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
              Neden Visionary Optics?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-black dark:text-white mb-3">✨ Kolay Kullanım</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Sezgisel arayüz sayesinde dakikalar içinde sistemi öğrenin. Teknik bilgi gerektirmez.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-black dark:text-white mb-3">📊 Detaylı Takip</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Her müşterinizin reçete geçmişini, sipariş durumunu ve ödeme bilgilerini tek yerden yönetin.
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-black dark:text-white mb-3">⚡ Hız ve Verimlilik</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    TC kimlik numarası ile anında müşteri bilgilerine ulaşın. Zaman kaybetmeyin.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-black dark:text-white mb-3">🔒 Güvenlik</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Müşteri verileriniz en üst düzeyde güvenlik protokolleri ile korunur.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section 
        id="cta"
        ref={(el) => sectionRefs.current["cta"] = el}
        className={`min-h-screen flex items-center px-4 transition-all duration-1000 ${
          visibleSections.has("cta") 
            ? "opacity-100 transform translate-y-0" 
            : "opacity-0 transform translate-y-10"
        }`}
      >
        <div className="container mx-auto">
          <div className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-white max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              İşletmenizi Dijitalleştirin
            </h2>
            <p className="text-xl mb-6 opacity-90">
              Bugün başlayın ve işletmenizi modern çağa taşıyın
            </p>
            <Button 
              onClick={onGetStarted}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-full shadow-lg"
            >
              Hemen Başlayın
            </Button>
          </div>
          
          {/* Footer */}
          <div className="text-center mt-12 text-gray-500 dark:text-gray-400">
            <p>© 2024 Visionary Optics. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
