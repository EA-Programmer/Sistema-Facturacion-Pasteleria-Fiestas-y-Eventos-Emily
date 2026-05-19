import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { LoginForm } from "@/components/auth/login-form";
import { getAdminSession } from "@/lib/auth";
import { brand } from "@/lib/brand";

export default async function LoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-xl shadow-pink-950/5 lg:grid-cols-[1fr_430px]">
        <div className="hidden bg-[var(--icing)] p-10 lg:block">
          <BrandMark />
          <div className="mt-16 max-w-lg">
            <p className="text-sm font-bold uppercase text-[var(--berry)]">Sistema interno</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-[var(--chocolate)]">
              Controla pedidos, productos y facturas con la identidad de Emily.
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Una base administrativa pensada para crecer hacia pedidos online y facturacion electronica SRI.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-3 text-sm">
            {["Pedidos", "Facturas", "Productos"].map((item) => (
              <div className="rounded-lg bg-white p-4 font-semibold text-slate-700 shadow-sm" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="lg:hidden">
            <BrandMark />
          </div>

          <div className="mt-8 lg:mt-0">
            <p className="text-sm font-bold uppercase text-[var(--berry)]">{brand.businessName}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Acceso administrativo</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Ingresa para gestionar pedidos, clientes, productos, pagos y facturas.
            </p>
          </div>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
