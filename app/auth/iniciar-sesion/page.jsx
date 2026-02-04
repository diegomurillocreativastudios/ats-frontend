'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
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
      // Simulate error for demo
      setMessage({
        type: 'error',
        text: 'Credenciales inválidas. Por favor, verifica tu email y contraseña.',
      });
    }, 1500);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Hero Section (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-vo-purple text-white p-16 flex-col justify-center">
        <div className="max-w-xl space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-lg" />
            <h1 className="text-3xl font-semibold">ATS App</h1>
          </div>

          {/* Hero Text */}
          <h2 className="text-5xl font-semibold leading-tight">
            Gestiona tu proceso
            <br />
            de reclutamiento de
            <br />
            forma inteligente
          </h2>

          <p className="text-lg leading-relaxed opacity-90">
            Plataforma integral para candidatos y equipos de RRHH. Seguimiento en
            tiempo real, evaluaciones automatizadas y comunicación centralizada.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo (Visible only on mobile) */}
          <div className="lg:hidden flex flex-col items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-vo-purple rounded-xl" />
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
              Iniciar Sesión
            </h2>
            <p className="text-gray-500">
              Ingresa tus credenciales para acceder al portal
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
              autoComplete="current-password"
            />

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  disabled={loading}
                  className="accent-vo-purple w-4 h-4 rounded border-white text-vo-purple focus:ring-2 focus:ring-vo-purple focus:ring-offset-0"
                />
                <span className="text-sm text-black">
                  Recordarme
                </span>
              </label>

              <Link
                href="/auth/forgot-password"
                className="text-sm text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full h-12"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
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

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-black">
              ¿No tienes cuenta?{' '}
              <Link
                href="/auth/registrate"
                className="text-vo-purple font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
