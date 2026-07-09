"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"

/**
 * Vista previa (mockup) del Login en estilo Neo Brutalista.
 * Página independiente para comparar contra el login actual sin afectarlo.
 * Ruta: /auth/iniciar-sesion-neo
 */
export default function IniciarSesionNeo() {
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E8F5E0] p-4 font-sans md:p-8">
      {/* Fondo con retícula sutil estilo brutalista */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.4]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(#57585B22 1px, transparent 1px), linear-gradient(90deg, #57585B22 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden border-4 border-black bg-white shadow-[12px_12px_0_0_#000] md:grid-cols-2">
        {/* Panel izquierdo: marca */}
        <div className="relative hidden flex-col justify-between border-black bg-[#6EB940] p-10 text-black md:flex md:border-r-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center border-4 border-black bg-white text-xl font-black shadow-[4px_4px_0_0_#000]">
              A
            </div>
            <span className="text-2xl font-black tracking-tight">ATS</span>
          </div>

          <div className="flex flex-col gap-6">
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight lg:text-5xl">
              Encuentra al
              <br />
              talento correcto,
              <br />
              más rápido.
            </h1>
            <p className="max-w-xs text-base font-medium leading-snug text-black/80">
              Gestiona candidatos, vacantes y procesos de selección en un solo lugar.
            </p>

            <ul className="flex flex-col gap-3">
              {[
                "Filtrado inteligente de CVs",
                "Seguimiento de candidatos",
                "Reportes en tiempo real",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-black bg-white text-sm font-black">
                    ✓
                  </span>
                  <span className="text-sm font-bold">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-black/60">
            Creativa Studios
          </span>
        </div>

        {/* Panel derecho: formulario */}
        <div className="flex flex-col justify-center bg-white p-6 md:p-10 lg:p-12">
          {/* Marca en móvil */}
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center border-4 border-black bg-[#6EB940] text-lg font-black shadow-[3px_3px_0_0_#000]">
              A
            </div>
            <span className="text-xl font-black tracking-tight text-black">ATS</span>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-black tracking-tight text-black">
              Iniciar sesión
            </h2>
            <p className="text-sm font-medium text-[#57585B]">
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="neo-email"
                className="text-sm font-black uppercase tracking-wide text-black"
              >
                Usuario o correo
              </label>
              <input
                id="neo-email"
                type="text"
                placeholder="tu@correo.com"
                className="h-12 w-full border-4 border-black bg-white px-4 text-sm font-medium text-black outline-none transition-shadow placeholder:text-[#57585B]/60 focus:shadow-[4px_4px_0_0_#6EB940]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="neo-password"
                className="text-sm font-black uppercase tracking-wide text-black"
              >
                Contraseña
              </label>
              <input
                id="neo-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="h-12 w-full border-4 border-black bg-white px-4 text-sm font-medium text-black outline-none transition-shadow placeholder:text-[#57585B]/60 focus:shadow-[4px_4px_0_0_#6EB940]"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-black">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-5 w-5 cursor-pointer appearance-none border-4 border-black bg-white checked:bg-[#6EB940]"
                />
                Mostrar
              </label>

              <Link
                href="#"
                className="border-b-2 border-black text-sm font-bold text-black hover:bg-[#438C39] hover:text-white"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              className="mt-2 h-12 w-full border-4 border-black bg-[#6EB940] text-base font-black uppercase tracking-wide text-black shadow-[6px_6px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000]"
            >
              Entrar
            </button>

            <div className="flex items-center gap-3">
              <span className="h-1 flex-1 bg-black" />
              <span className="text-xs font-black uppercase tracking-widest text-[#57585B]">
                o continúa con
              </span>
              <span className="h-1 flex-1 bg-black" />
            </div>

            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-2 border-4 border-black bg-white text-sm font-black uppercase tracking-wide text-black shadow-[4px_4px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A66C2] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000]"
            >
              <span className="flex h-6 w-6 items-center justify-center bg-[#0A66C2] text-xs font-black text-white">
                in
              </span>
              LinkedIn
            </button>
          </form>

          <p className="mt-8 flex items-center justify-center gap-1 text-sm font-medium text-[#57585B]">
            ¿No tienes cuenta?
            <Link
              href="#"
              className="border-b-2 border-black font-black text-black hover:bg-[#6EB940]"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
