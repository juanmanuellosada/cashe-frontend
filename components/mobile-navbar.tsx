import { LayoutDashboard, Receipt, CreditCard, Wallet, PieChart } from "lucide-react"
import Link from "next/link"

export function MobileNavbar() {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full border-t bg-background md:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        <Link href="/" className="flex flex-col items-center justify-center px-3">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <span className="mt-1 text-xs">Dashboard</span>
        </Link>
        <Link href="/finanzas" className="flex flex-col items-center justify-center px-3">
          <Receipt className="h-5 w-5" />
          <span className="mt-1 text-xs">Finanzas</span>
        </Link>
        <Link href="/cuentas" className="flex flex-col items-center justify-center px-3">
          <Wallet className="h-5 w-5" />
          <span className="mt-1 text-xs">Cuentas</span>
        </Link>
        <Link href="/tarjetas" className="flex flex-col items-center justify-center px-3">
          <CreditCard className="h-5 w-5" />
          <span className="mt-1 text-xs">Tarjetas</span>
        </Link>
        <Link href="/analisis" className="flex flex-col items-center justify-center px-3">
          <PieChart className="h-5 w-5" />
          <span className="mt-1 text-xs">Análisis</span>
        </Link>
      </div>
    </div>
  )
}
