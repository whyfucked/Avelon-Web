"use client";

import { useEffect, useState } from "react";
import { UsersRound, Server, Gauge, MessageCircle } from "lucide-react";

interface Stats {
  clients: number;
  servers: number;
  uptime: string;
}

interface HeroContainerProps {
  onPricingClick?: () => void;
  onFeaturesClick?: () => void;
}

export function HeroContainer({ onPricingClick, onFeaturesClick }: HeroContainerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<Stats>({
    clients: 50,
    servers: 75,
    uptime: "99.9%"
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setStats({
            clients: data.clients,
            servers: data.servers,
            uptime: data.uptime
          });
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };
    fetchStats();
  }, []);

  const statsData = [
    { number: `${stats.clients}+`, label: "клиентов", Icon: UsersRound },
    { number: `${stats.servers}+`, label: "серверов", Icon: Server },
    { number: stats.uptime, label: "uptime", Icon: Gauge },
    { number: "24/7", label: "поддержка", Icon: MessageCircle },
  ];

  return (
    <div className="relative w-full max-w-[1320px] aspect-[1320/528]">
      {/* SVG with border */}
      <svg 
        className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`} 
        viewBox="0 0 1320 528" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id="containerClip">
            <path d="
              M 48 0 
              H 1272 
              Q 1320 0 1320 48 
              V 480 
              Q 1320 528 1272 528 
              H 534 
              Q 486 528 486 480 
              V 396 
              Q 486 348 438 348 
              H 48 
              Q 0 348 0 300 
              V 48 
              Q 0 0 48 0 
              Z
            " />
          </clipPath>
        </defs>
        <image 
          href="/new.jpg" 
          width="1320" 
          height="528" 
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#containerClip)"
        />
      </svg>

      {/* Blur container with text */}
      <div 
        className={`absolute top-[25%] sm:top-[33%] left-[2%] -translate-y-1/2 p-3 sm:p-5 md:p-7 rounded-xl sm:rounded-3xl backdrop-blur-sm bg-black/5 dark:bg-white/5 transition-all duration-700 ease-out ${
          isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
        }`}
        style={{ transitionDelay: "200ms" }}
      >
        <h1 className="font-heading text-sm sm:text-xl md:text-3xl font-bold text-white mb-1.5 sm:mb-3 md:mb-4">
          Игровой хостинг нового поколения
        </h1>
        <p className="font-heading text-[10px] sm:text-sm md:text-base text-white/80 max-w-[200px] sm:max-w-[380px] md:max-w-[480px] leading-relaxed flex flex-wrap items-center gap-1">
          <span>Мгновенная активация серверов,</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded-md">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>низкий пинг</span>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded-md">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>защита от DDoS</span>
          </span>
        </p>
        <p className="font-heading text-[10px] sm:text-sm md:text-base text-white/80 max-w-[200px] sm:max-w-[380px] md:max-w-[480px] mt-1">
          Создайте свой сервер за пару кликов.
        </p>
        
        {/* Buttons */}
        <div 
          className={`flex items-center gap-2 sm:gap-3 mt-2 sm:mt-4 md:mt-6 transition-all duration-500 ease-out relative z-10 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "400ms" }}
        >
          <button 
            onClick={onPricingClick}
            className="group px-2.5 sm:px-4 md:px-6 py-1.5 sm:py-2.5 md:py-3 bg-foreground text-background rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity font-heading"
          >
            <span className="group-hover">Наши тарифы</span>
          </button>
          <button 
            onClick={onFeaturesClick}
            className="px-2.5 sm:px-4 md:px-6 py-1.5 sm:py-2.5 md:py-3 text-white border border-white/30 rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm font-medium cursor-pointer hover:bg-white/10 transition-colors font-heading"
          >
            Преимущества
          </button>
        </div>
      </div>
      
      {/* Stats in cutout area */}
      <div className="absolute bottom-0 left-0 w-[33%] h-[34%] flex items-center justify-center">
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-6">
          {statsData.map((stat, i) => (
            <div 
              key={i} 
              className={`flex flex-col items-center transition-all duration-500 ease-out ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${300 + i * 100}ms` }}
            >
              <div className="w-5 h-5 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full border sm:border-2 border-border flex items-center justify-center mb-0.5 sm:mb-1 md:mb-2">
                <stat.Icon className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <span className="font-heading text-[10px] sm:text-base md:text-xl font-bold text-foreground">
                {stat.number}
              </span>
              <span className="font-heading text-[5px] sm:text-[7px] md:text-[9px] text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Minecraft Rig Character */}
      <div 
        className={`absolute right-[5%] bottom-[-10%] w-[75%] max-w-[650px] transition-all duration-1000 ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
        style={{ 
          transitionDelay: "600ms",
          animation: isVisible ? "float 3s ease-in-out infinite" : "none"
        }}
      >
        {/* Светящийся эффект снизу */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-12 bg-gradient-to-t from-blue-500/30 via-blue-400/10 to-transparent blur-2xl rounded-full" />
        
        {/* Основное изображение */}
        <img 
          src="/rig123.png" 
          alt="Minecraft Characters" 
          className="w-full h-auto drop-shadow-2xl relative z-10"
          style={{
            filter: "drop-shadow(0 0 40px rgba(59, 130, 246, 0.25)) drop-shadow(0 10px 60px rgba(0, 0, 0, 0.3))"
          }}
        />
        
        {/* Декоративные частицы вокруг персонажей */}
        <div className="absolute top-[15%] left-[5%] w-2 h-2 bg-blue-400/70 rounded-full animate-ping" style={{ animationDuration: "2s" }} />
        <div className="absolute top-[25%] right-[15%] w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
        <div className="absolute top-[45%] left-[15%] w-1 h-1 bg-blue-300/70 rounded-full animate-ping" style={{ animationDuration: "3s", animationDelay: "1s" }} />
        <div className="absolute top-[35%] right-[5%] w-1.5 h-1.5 bg-sky-400/70 rounded-full animate-ping" style={{ animationDuration: "2.8s", animationDelay: "0.3s" }} />
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }
      `}</style>
    </div>
  );
}
