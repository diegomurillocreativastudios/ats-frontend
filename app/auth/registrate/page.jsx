'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function RegistroPage() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const validateForm = () => {
    const newErrors = {};

    // Nombre validation
    if (!formData.nombre) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    // Apellido validation
    if (!formData.apellido) {
      newErrors.apellido = 'El apellido es requerido';
    } else if (formData.apellido.length < 2) {
      newErrors.apellido = 'El apellido debe tener al menos 2 caracteres';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Teléfono validation
    if (!formData.telefono) {
      newErrors.telefono = 'El teléfono es requerido';
    } else if (formData.telefono.length < 8) {
      newErrors.telefono = 'El teléfono debe tener al menos 8 dígitos';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Debes confirmar tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!validateForm()) return;

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // Simulate success for demo
      setMessage({
        type: 'success',
        text: 'Cuenta creada exitosamente. Redirigiendo al portal...',
      });
    }, 1500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Hero Section (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-vo-magenta text-white p-16 flex-col justify-center">
        <div className="max-w-xl space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-lg" />
            <h1 className="text-3xl font-semibold">ATS App</h1>
          </div>

          {/* Hero Text */}
          <h2 className="text-5xl font-semibold leading-tight">
            Comienza tu viaje
            <br />
            profesional con
            <br />
            nosotros
          </h2>

          <p className="text-lg leading-relaxed opacity-90">
            Únete a nuestra plataforma y accede a las mejores oportunidades
            laborales. Gestiona tu perfil, aplica a vacantes y mantente
            conectado con equipos de RRHH.
          </p>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo (Visible only on mobile) */}
          <div className="lg:hidden flex flex-col items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-vo-magenta rounded-xl" />
            <h1 className="text-2xl font-semibold text-black">
              ATS RRHH
            </h1>
            <p className="text-gray-500 text-center">
              Sistema de Reclutamiento
            </p>
          </div>

          {/* Form Header */}
          <div className="space-y-3">
            <h2 className="text-3xl lg:text-4xl font-semibold text-black">
              Crear Cuenta
            </h2>
            <p className="text-gray-500">
              Completa tus datos para crear tu cuenta
            </p>
          </div>

          {/* Alert Message */}
          {message && (
            <div
              className={`
                p-4 rounded-md
                ${message.type === 'error' ? 'bg-red-50 border border-vo-pink' : ''}
                ${message.type === 'success' ? 'bg-green-50 border border-green-500' : ''}
              `}
              role="alert"
            >
              <p
                className={`text-sm ${message.type === 'error' ? 'text-vo-pink' : 'text-green-500'}`}
              >
                {message.text}
              </p>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Nombre"
                type="text"
                id="nombre"
                name="nombre"
                placeholder="Juan"
                required
                value={formData.nombre}
                onChange={handleChange}
                error={errors.nombre}
                disabled={loading}
                autoComplete="given-name"
              />

              <Input
                label="Apellido"
                type="text"
                id="apellido"
                name="apellido"
                placeholder="Pérez"
                required
                value={formData.apellido}
                onChange={handleChange}
                error={errors.apellido}
                disabled={loading}
                autoComplete="family-name"
              />
            </div>

            <Input
              label="Email"
              type="email"
              id="email"
              name="email"
              placeholder="tu@email.com"
              required
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              disabled={loading}
              autoComplete="email"
            />

            <Input
              label="Teléfono"
              type="tel"
              id="telefono"
              name="telefono"
              placeholder="+54 11 1234 5678"
              required
              value={formData.telefono}
              onChange={handleChange}
              error={errors.telefono}
              disabled={loading}
              autoComplete="tel"
            />

            <Input
              label="Contraseña"
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              disabled={loading}
              autoComplete="new-password"
            />

            <Input
              label="Confirmar Contraseña"
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="••••••••"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              disabled={loading}
              autoComplete="new-password"
            />

            {/* Terms and Conditions */}
            <p className="text-sm text-gray-500">
              Al registrarte, aceptas nuestros{' '}
              <Link
                href="/terminos"
                className="text-vo-magenta hover:underline focus:outline-none focus:ring-2 focus:ring-vo-magenta focus:ring-offset-2 rounded"
              >
                Términos y Condiciones
              </Link>
            </p>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="secondary"
              loading={loading}
              className="w-full h-12"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                o
              </span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-black">
              ¿Ya tienes cuenta?{' '}
              <Link
                href="/auth/iniciar-sesion"
                className="text-vo-magenta font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-vo-magenta focus:ring-offset-2 rounded"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
