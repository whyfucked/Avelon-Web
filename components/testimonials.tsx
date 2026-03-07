"use client"

import { useState, useEffect, useRef } from "react"
import { Star, Quote } from "lucide-react"
import Image from "next/image"

const testimonials = [
  {
    id: 1,
    name: "Adobe_AnimV3",
    avatar: "/adobev3.png",
    game: "Эндермен",
    price: "374₽",
    rating: 10,
    text: "Запускали 10+ человек пока не падал * 60+ модов 👌",
  },
  {
    id: 2,
    name: "Xinevi",
    avatar: "/Xinevi.png",
    game: "Эндермен",
    price: "374₽",
    rating: 10,
    text: "Очень хорошее железо, сборка на 250+ модов (именно серверных) летает, еще и ресурсы за буст накинули ❤️",
  },
  {
    id: 3,
    name: "MersyCSwag",
    avatar: "/mersyez.png",
    game: "Зомби",
    price: "132",
    rating: 7,
    text: "Чото ноды вырубаются и вечно делают все а так все мощное",
  },
]

export function Testimonials() {
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })
  const [activeIndex, setActiveIndex] = useState(0)
  const dotsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateIndicator = () => {
      if (!dotsRef.current) return
      const activeDot = dotsRef.current.querySelector(`[data-index="${activeIndex}"]`) as HTMLButtonElement
      if (activeDot) {
        setIndicatorStyle({
          width: activeDot.offsetWidth,
          left: activeDot.offsetLeft,
        })
      }
    }
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeIndex])

  return (
    <section className="px-3 sm:px-8 py-12 sm:py-20 md:px-16 lg:px-24">
      <div className="max-w-[1320px] mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground md:text-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            Отзывы клиентов
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Что говорят наши пользователи о сервисе
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className="relative rounded-2xl sm:rounded-[32px] border border-border/50 bg-card/30 backdrop-blur-sm p-4 sm:p-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
            >
              {/* Quote icon */}
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 opacity-10">
                <Quote className="size-12 sm:size-16 text-foreground" />
              </div>

              {/* User info */}
              <div className="relative z-10 flex items-start gap-3 mb-3 sm:mb-4">
                <div className="relative size-12 sm:size-14 rounded-xl overflow-hidden bg-muted/50 flex-shrink-0">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    width={56}
                    height={56}
                    className="size-full object-cover"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-sm sm:text-base font-semibold text-foreground truncate">
                    {testimonial.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {testimonial.game}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground/60">•</span>
                    <span className="text-[10px] sm:text-xs font-medium text-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      {testimonial.price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="relative z-10 flex items-center gap-1 mb-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-3 sm:size-3.5 ${
                      i < testimonial.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-muted/30 text-muted/30"
                    }`}
                  />
                ))}
                <span className="ml-1 text-xs sm:text-sm font-medium text-foreground">
                  {testimonial.rating}/10
                </span>
              </div>

              {/* Review text */}
              <p className="relative z-10 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {testimonial.text}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile carousel dots (optional, for future enhancement) */}
        <div ref={dotsRef} className="relative mt-6 flex justify-center gap-2 md:hidden">
          <div
            className="absolute top-0 h-2 rounded-full bg-primary transition-all duration-300 ease-out"
            style={{
              width: indicatorStyle.width,
              left: indicatorStyle.left,
            }}
          />
          {testimonials.map((_, index) => (
            <button
              key={index}
              data-index={index}
              onClick={() => setActiveIndex(index)}
              className={`relative z-10 size-2 rounded-full transition-colors ${
                activeIndex === index ? "bg-transparent" : "bg-muted/50"
              }`}
              aria-label={`Перейти к отзыву ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
