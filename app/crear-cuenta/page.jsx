"use client";

import { useState } from "react";
import Link from "next/link";
import Input from "@/components/auth/Input";
import Button from "@/components/auth/Button";
import AuthBrand from "@/components/auth/AuthBrand";

export default function CrearCuenta() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }
    if (!formData.acceptTerms) {
      alert("Debes aceptar los términos y condiciones");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      console.log("Form submitted:", formData);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex font-inter">
      {/* Desktop: Left Panel */}
      <div className="hidden lg:flex flex-1 bg-vo-magenta text-white flex-col justify-center px-16 gap-8">
        {/* Brand Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center text-[32px] font-bold">
              C
            </div>
            <div className="text-[32px] font-bold leading-none">
              ATS App
            </div>
          </div>

          <h1 className="text-[40px] font-bold leading-[1.2]">
            Únete a la plataforma<br />líder en reclutamiento
          </h1>
          <p className="text-lg text-white/80 leading-normal">
            Crea tu cuenta y comienza a gestionar<br />
            tu proceso de selección de manera<br />
            inteligente.
          </p>
        </div>

        {/* Benefits */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-vo-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-base">Configuración rápida en minutos</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-vo-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-base">Datos seguros y encriptados</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-vo-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-base">Soporte 24/7 disponible</span>
          </div>
        </div>
      </div>

      {/* Tablet: Top Header */}
      <div className="hidden md:flex lg:hidden fixed top-0 left-0 right-0 bg-vo-magenta text-white h-[120px] items-center justify-between px-8 gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-[10px] bg-white/10 flex items-center justify-center text-[22px] font-bold">
            C
          </div>
          <div className="text-xl font-bold">ATS App</div>
        </div>
        <p className="text-sm text-white/80">Sistema de Reclutamiento Inteligente</p>
      </div>

      {/* Right Panel: Form */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 md:px-10 lg:px-12 py-6 md:py-40 lg:py-0 md:max-w-full lg:max-w-[560px]">
        <div className="w-full md:max-w-[500px] lg:max-w-[420px]">
          {/* Mobile Logo */}
          <div className="md:hidden w-full flex justify-center mb-5">
            <AuthBrand size="mobile-register" variant="light-secondary" />
          </div>

          {/* Form Container */}
          <div className="flex flex-col gap-5 md:gap-5 lg:gap-6">
            {/* Form Header */}
            <div className="flex flex-col items-center md:items-start gap-1 md:gap-1.5 lg:gap-2 text-center md:text-left">
              <h2 className="text-[22px] md:text-2xl lg:text-[28px] font-bold text-foreground">
                Crear Cuenta
              </h2>
              <p className="text-sm md:text-sm lg:text-base text-muted-foreground">
                Completa tus datos{" "}
                <span className="hidden lg:inline">para registrarte</span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Inputs Container */}
              <div className="flex flex-col gap-3.5 md:gap-4">
                {/* Name Row - Desktop */}
                <div className="hidden lg:grid grid-cols-2 gap-4">
                  <Input
                    label="Nombre"
                    type="text"
                    name="firstName"
                    placeholder="Juan"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                  <Input
                    label="Apellido"
                    type="text"
                    name="lastName"
                    placeholder="Pérez"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>

                {/* Name Fields - Mobile & Tablet */}
                <div className="lg:hidden">
                  <Input
                    label="Nombre"
                    type="text"
                    name="firstName"
                    placeholder="Juan"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
                <div className="lg:hidden">
                  <Input
                    label="Apellido"
                    type="text"
                    name="lastName"
                    placeholder="Pérez"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>

                <Input
                  label="Correo electrónico"
                  type="email"
                  name="email"
                  placeholder="juan@empresa.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                />

                <Input
                  label="Teléfono"
                  type="tel"
                  name="phone"
                  placeholder="+52 55 1234 5678"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                />

                <Input
                  label="Contraseña"
                  type="password"
                  name="password"
                  placeholder="Mínimo 8 caracteres"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />

                <Input
                  label="Confirmar contraseña"
                  type="password"
                  name="confirmPassword"
                  placeholder="Repetir contraseña"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />

                {/* Terms Checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-input text-vo-magenta focus:ring-vo-magenta"
                  />
                  <label htmlFor="terms" className="text-xs md:text-[13px] lg:text-[13px] text-foreground">
                    Acepto los{" "}
                    <Link href="/terminos" className="text-vo-magenta hover:underline">
                      Términos y Condiciones
                    </Link>
                  </label>
                </div>
              </div>

              {/* Button */}
              <Button type="submit" variant="secondary" disabled={loading}>
                {loading ? "Creando cuenta..." : "Crear Cuenta"}
              </Button>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-center gap-1 text-[13px] md:text-[13px] lg:text-sm">
              <span className="text-muted-foreground">¿Ya tienes cuenta?</span>
              <Link
                href="/iniciar-sesion"
                className="font-medium text-vo-magenta hover:underline"
              >
                Inicia sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
