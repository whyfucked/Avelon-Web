import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 pt-32 pb-20">
        <div className="text-center">
          <div className="relative">
            <span className="text-[150px] font-bold leading-none text-primary/10 md:text-[200px]">404</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-bold text-foreground md:text-8xl">404</span>
            </div>
          </div>
          
          <h1 className="mt-8 font-heading text-2xl font-bold text-foreground md:text-3xl">
            Страница не найдена
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Похоже, вы заблудились. Страница, которую вы ищете, не существует или была перемещена.
          </p>
          
          <div className="mt-10">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
            >
              <Home className="size-4" />
              На главную
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}