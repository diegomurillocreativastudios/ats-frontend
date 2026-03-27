"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/auth/Input";
import Button from "@/components/auth/Button";
import AuthBrand from "@/components/auth/AuthBrand";
import Snackbar from "@/components/ui/Snackbar";

const getOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

export default function IniciarSesion() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isAdminDemo =
      formData.email?.trim().toLowerCase() === "admin" &&
      formData.password === "admin";

    if (!formData.email) {
      newErrors.email = "El email es requerido";
    } else if (!isAdminDemo && !emailRegex.test(formData.email)) {
      newErrors.email = "Email inválido";
    }
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (!isAdminDemo && formData.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCloseSnackbar = useCallback(() => {
    setMessage(null);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await fetch(`${getOrigin()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const text =
          data.message ||
          data.detail ||
          "Credenciales inválidas. Por favor, verifica tu email y contraseña.";
        setMessage({
          type: "error",
          text: Array.isArray(text) ? text[0] : text
        });
        return;
      }

      setMessage({ type: "success", text: "Sesión iniciada correctamente" });
      const from =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("from")
          : null;
      router.push(
        from && from.startsWith("/") ? from : "/portal-rrhh/candidatos"
      );
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Error de conexión. Intenta de nuevo."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-inter">
      {/* Desktop & Tablet: Left Panel */}
      <div className="hidden md:flex md:w-80 lg:flex-1 bg-vo-purple text-white flex-col justify-center md:px-10 lg:px-16 md:gap-6 lg:gap-8">
        <div className="flex flex-col md:gap-6 lg:gap-6">
          <div className="flex items-center md:gap-3 lg:gap-4">
            <div className="h-11 w-11 lg:h-14 lg:w-14 rounded-[10px] lg:rounded-xl bg-white/10 flex items-center justify-center text-[22px] lg:text-[32px] font-bold">
              C
            </div>
            <div className="text-xl lg:text-[32px] font-bold leading-none">
              ATS App
            </div>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-[40px] font-bold leading-[1.2]">
              Sistema de Gestión de<br />Reclutamiento Inteligente
            </h1>
            <p className="text-lg text-white/80 leading-normal mt-6">
              Optimiza tu proceso de selección con IA.<br />
              Gestiona candidatos, vacantes y evaluaciones<br />
              en un solo lugar.
            </p>
          </div>

          <div className="lg:hidden">
            <h1 className="text-2xl font-bold leading-[1.2]">
              Sistema de Gestión<br />de Reclutamiento
            </h1>
            <p className="text-sm text-white/80 leading-[1.4] mt-6">
              Optimiza tu proceso de<br />selección con IA.
            </p>
          </div>
        </div>

        <div className="hidden lg:flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-vo-sky" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-base">Matching inteligente de candidatos</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-vo-sky" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-base">Integración con Evalart y LinkedIn</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-vo-sky" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-base">Reportes ejecutivos en tiempo real</span>
          </div>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 md:px-10 lg:px-16 py-6 md:py-0 md:max-w-[448px] lg:max-w-[560px]">
        <div className="w-full md:max-w-[360px] lg:max-w-[400px]">
          <div className="md:hidden w-full flex justify-center mb-6">
            <AuthBrand size="mobile-login" variant="light-primary" />
          </div>

          <div className="flex flex-col gap-6 md:gap-6 lg:gap-8">
            <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
              <h2 className="text-[22px] md:text-2xl lg:text-[28px] font-bold text-foreground">
                Iniciar Sesión
              </h2>
              <p className="text-sm md:text-sm lg:text-base text-muted-foreground">
                Ingresa tus credenciales{" "}
                <span className="hidden lg:inline">para acceder al sistema</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 md:gap-4 lg:gap-5">
                <Input
                  label="Correo electrónico"
                  type="email"
                  name="email"
                  placeholder="nombre@empresa.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  disabled={loading}
                />

                <Input
                  label="Contraseña"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  disabled={loading}
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showPassword"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    disabled={loading}
                    className="h-4 w-4 rounded border-input accent-vo-purple focus:ring-vo-purple focus:ring-2 focus:ring-offset-0"
                    aria-label="Mostrar contraseña"
                  />
                  <label
                    htmlFor="showPassword"
                    className="text-xs md:text-[13px] text-foreground cursor-pointer"
                  >
                    Mostrar contraseña
                  </label>
                </div>

                <div className="flex justify-center md:justify-end">
                  <Link
                    href="/recuperar-contrasena"
                    className="text-[13px] font-medium text-vo-purple hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="flex-1 h-px bg-border"></div>
                    <span className="text-xs text-muted-foreground">o</span>
                    <div className="flex-1 h-px bg-border"></div>
                  </div>

                  <Button variant="outline">
                    Continuar con Google
                  </Button>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-center gap-1 text-[13px] md:text-[13px] lg:text-sm">
              <span className="text-muted-foreground">¿No tienes cuenta?</span>
              <Link
                href="/auth/registrarse"
                className="font-medium text-vo-purple hover:underline"
              >
                <span className="md:hidden">Regístrate</span>
                <span className="hidden md:inline">Regístrate aquí</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Snackbar
        open={!!message}
        onClose={handleCloseSnackbar}
        variant={message?.type === "error" ? "error" : "success"}
        message={message?.text ?? ""}
      />
    </div>
  );
}
