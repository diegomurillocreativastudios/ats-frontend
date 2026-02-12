"use client";

import { useState } from "react";
import Link from "next/link";
import Input from "@/components/auth/Input";
import Button from "@/components/auth/Button";
import AuthBrand from "@/components/auth/AuthBrand";

export default function IniciarSesion() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      console.log("Form submitted:", formData);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex font-inter">
      {/* Desktop & Tablet: Left Panel */}
      <div className="hidden md:flex md:w-80 lg:flex-1 bg-vo-purple text-white flex-col justify-center md:px-10 lg:px-16 md:gap-6 lg:gap-8">
        {/* Brand Section */}
        <div className="flex flex-col md:gap-6 lg:gap-6">
          <div className="flex items-center md:gap-3 lg:gap-4">
            <div className="h-11 w-11 lg:h-14 lg:w-14 rounded-[10px] lg:rounded-xl bg-white/10 flex items-center justify-center text-[22px] lg:text-[32px] font-bold">
              C
            </div>
            <div className="text-xl lg:text-[32px] font-bold leading-none">
              ATS App
            </div>
          </div>

          {/* Tagline - hidden on tablet */}
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

          {/* Tagline - tablet only */}
          <div className="lg:hidden">
            <h1 className="text-2xl font-bold leading-[1.2]">
              Sistema de Gestión<br />de Reclutamiento
            </h1>
            <p className="text-sm text-white/80 leading-[1.4] mt-6">
              Optimiza tu proceso de<br />selección con IA.
            </p>
          </div>
        </div>

        {/* Features - desktop only */}
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
          {/* Mobile Logo */}
          <div className="md:hidden w-full flex justify-center mb-6">
            <AuthBrand size="mobile-login" variant="light-primary" />
          </div>

          {/* Form Container */}
          <div className="flex flex-col gap-6 md:gap-6 lg:gap-8">
            {/* Form Header */}
            <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
              <h2 className="text-[22px] md:text-2xl lg:text-[28px] font-bold text-foreground">
                Iniciar Sesión
              </h2>
              <p className="text-sm md:text-sm lg:text-base text-muted-foreground">
                Ingresa tus credenciales{" "}
                <span className="hidden lg:inline">para acceder al sistema</span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Inputs */}
              <div className="flex flex-col gap-4 md:gap-4 lg:gap-5">
                <Input
                  label="Correo electrónico"
                  type="email"
                  name="email"
                  placeholder="nombre@empresa.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                />

                <Input
                  label="Contraseña"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />

                <div className="flex justify-center md:justify-end">
                  <Link
                    href="/recuperar-contrasena"
                    className="text-[13px] font-medium text-vo-purple hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>

                {/* Divider & Social */}
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

            {/* Footer */}
            <div className="flex items-center justify-center gap-1 text-[13px] md:text-[13px] lg:text-sm">
              <span className="text-muted-foreground">¿No tienes cuenta?</span>
              <Link
                href="/crear-cuenta"
                className="font-medium text-vo-purple hover:underline"
              >
                <span className="md:hidden">Regístrate</span>
                <span className="hidden md:inline">Regístrate aquí</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
