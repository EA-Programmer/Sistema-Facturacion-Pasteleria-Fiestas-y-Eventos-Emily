import {
  BarChart3,
  CakeSlice,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  UsersRound,
} from "lucide-react";

export const navigationItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Pedidos",
    href: "/pedidos",
    icon: ShoppingBag,
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: UsersRound,
  },
  {
    label: "Productos",
    href: "/productos",
    icon: CakeSlice,
  },
  {
    label: "Facturas",
    href: "/facturas",
    icon: FileText,
  },
  {
    label: "Pagos",
    href: "/pagos",
    icon: CreditCard,
  },
  {
    label: "Reportes",
    href: "/reportes",
    icon: BarChart3,
  },
  {
    label: "Configuracion",
    href: "/configuracion",
    icon: Settings,
  },
] as const;
