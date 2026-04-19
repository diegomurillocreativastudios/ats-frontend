# Spec Frontend: Integración Google Calendar - Módulo Entrevistas

**Stack:** Next.js 16 App Router + Vercel  
**Objetivo:** Sincronizar entrevistas con Google Calendar del usuario

---

## 1. ESTRUCTURA DE ARCHIVOS

```
src/
├── app/
│   ├── interviews/
│   │   ├── [id]/
│   │   │   ├── page.tsx                    # Detail view - muestra widget de calendario
│   │   │   └── edit/
│   │   │       └── page.tsx                # Form para editar - incluye date/time picker
│   ├── settings/
│   │   └── calendar/
│   │       ├── page.tsx                    # Settings de Google Calendar (connect/disconnect)
│   │       └── layout.tsx
│   └── api/
│       ├── auth/
│       │   └── google/
│       │       └── callback/
│       │           └── route.ts            # Route handler para OAuth callback
│       └── proxy/                          # (Optional) Proxy para llamadas al backend
├── components/
│   ├── interviews/
│   │   ├── InterviewCalendarWidget.tsx     # Widget que muestra estado + link a Google
│   │   ├── GoogleCalendarConnect.tsx       # Botón para conectar Google
│   │   ├── GoogleCalendarDisconnect.tsx    # Botón para desconectar
│   │   ├── InterviewDatePicker.tsx         # Date/time picker para entrevistas
│   │   └── InterviewForm.tsx               # Form principal (modificado)
│   └── common/
│       ├── LoadingSpinner.tsx
│       └── Toast.tsx                       # Para feedback de usuario
├── hooks/
│   ├── useGoogleCalendar.ts                # Estado de conexión + métodos
│   ├── useInterviewForm.ts                 # (modificado) Agregar lógica de calendario
│   └── useAsync.ts                         # Helper para async operations
├── lib/
│   ├── api-client.ts                       # Cliente HTTP para backend
│   ├── google-calendar.ts                  # Funciones OAuth + calendario
│   └── date-utils.ts                       # Utilidades de fecha/zona horaria
├── types/
│   ├── interview.ts
│   ├── calendar.ts                         # NUEVO: tipos para Google Calendar
│   └── api.ts
└── context/
    └── GoogleCalendarContext.tsx           # (Optional) Contexto global para estado
```

---

## 2. TIPOS TYPESCRIPT

**types/calendar.ts:**

```typescript
export interface GoogleCalendarStatus {
  isConnected: boolean;
  email: string;
  connectedAt: string | null;
}

export interface InterviewCalendarEvent {
  id: string;
  interviewId: string;
  googleEventId: string;
  googleCalendarId: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  googleCalendarUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleOAuthResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface CalendarSyncResponse {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors?: Array<{ interviewId: string; error: string }>;
}

export interface Interview {
  id: string;
  title: string;
  candidateName: string;
  positionTitle: string;
  scheduledDate: string | null;  // ISO 8601
  scheduledTime: string | null;  // HH:mm
  timezone: string;              // e.g., 'America/El_Salvador'
  interviewers: string[];
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterviewRequest {
  title: string;
  candidateName: string;
  positionTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  interviewers: string[];
  notes?: string;
}

export interface UpdateInterviewRequest
  extends Partial<CreateInterviewRequest> {
  id: string;
}
```

---

## 3. SERVICIOS (lib/)

**lib/google-calendar.ts:**

```typescript
import { GoogleCalendarStatus, GoogleOAuthResponse, CalendarSyncResponse } from '@/types/calendar';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Obtiene la URL de autorización de Google
 */
export async function getGoogleAuthUrl(): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/interviews/auth/google/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.authUrl;
  } catch (error) {
    console.error('[GoogleCalendar] Error getting auth URL:', error);
    throw error;
  }
}

/**
 * Maneja el callback de Google OAuth
 * Llamado desde route handler /api/auth/google/callback
 */
export async function handleGoogleCallback(
  code: string,
  state: string
): Promise<GoogleOAuthResponse> {
  try {
    const response = await fetch(`${API_BASE}/interviews/auth/google/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
      credentials: 'include', // Si usas cookies
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'OAuth callback failed');
    }

    return data;
  } catch (error) {
    console.error('[GoogleCalendar] Error in callback:', error);
    throw error;
  }
}

/**
 * Verifica si el usuario tiene Google Calendar conectado
 */
export async function checkCalendarStatus(): Promise<GoogleCalendarStatus> {
  try {
    const response = await fetch(`${API_BASE}/interviews/calendar/status`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      // Si 401, usuario no autenticado
      if (response.status === 401) {
        return { isConnected: false, email: '', connectedAt: null };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[GoogleCalendar] Error checking status:', error);
    return { isConnected: false, email: '', connectedAt: null };
  }
}

/**
 * Desconecta Google Calendar del usuario
 */
export async function disconnectGoogleCalendar(): Promise<GoogleOAuthResponse> {
  try {
    const response = await fetch(`${API_BASE}/interviews/calendar/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Disconnect failed');
    }

    return data;
  } catch (error) {
    console.error('[GoogleCalendar] Error disconnecting:', error);
    throw error;
  }
}

/**
 * Obtiene el evento de Google Calendar asociado a una entrevista
 */
export async function getInterviewCalendarEvent(
  interviewId: string
): Promise<any> {
  try {
    const response = await fetch(
      `${API_BASE}/interviews/${interviewId}/calendar-event`,
      {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }
    );

    if (response.status === 404) {
      return null; // No existe evento
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[GoogleCalendar] Error fetching calendar event:', error);
    throw error;
  }
}

/**
 * Sincronización manual de entrevistas con Google Calendar
 */
export async function syncCalendarEvents(): Promise<CalendarSyncResponse> {
  try {
    const response = await fetch(`${API_BASE}/interviews/calendar/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[GoogleCalendar] Error syncing calendar:', error);
    throw error;
  }
}
```

**lib/date-utils.ts:**

```typescript
/**
 * Obtiene la zona horaria del navegador del usuario
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Formatea fecha para input type="date"
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea hora para input type="time"
 */
export function formatTimeForInput(time: string | null): string {
  if (!time) return '09:00';
  // Asume formato HH:mm
  return time.length === 5 ? time : time.substring(0, 5);
}

/**
 * Valida que la fecha no sea en el pasado
 */
export function isValidFutureDate(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

/**
 * Convierte fecha + hora a ISO 8601
 */
export function toISODateTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

/**
 * Calcula minutos entre dos horas (para validar duraciones)
 */
export function getMinutesBetween(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return endH * 60 + endM - (startH * 60 + startM);
}
```

---

## 4. HOOKS

**hooks/useGoogleCalendar.ts:**

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  checkCalendarStatus,
  disconnectGoogleCalendar,
  getGoogleAuthUrl,
  syncCalendarEvents,
} from '@/lib/google-calendar';
import { GoogleCalendarStatus, CalendarSyncResponse } from '@/types/calendar';

export function useGoogleCalendar() {
  const [status, setStatus] = useState<GoogleCalendarStatus>({
    isConnected: false,
    email: '',
    connectedAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Cargar estado inicial
  useEffect(() => {
    const loadStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const status = await checkCalendarStatus();
        setStatus(status);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('[useGoogleCalendar] Error loading status:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      const authUrl = await getGoogleAuthUrl();
      // Redirigir a Google
      window.location.href = authUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      console.error('[useGoogleCalendar] Error connecting:', err);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      await disconnectGoogleCalendar();
      setStatus({ isConnected: false, email: '', connectedAt: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(message);
      console.error('[useGoogleCalendar] Error disconnecting:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sync = useCallback(async (): Promise<CalendarSyncResponse | null> => {
    try {
      setError(null);
      setIsSyncing(true);
      const result = await syncCalendarEvents();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      console.error('[useGoogleCalendar] Error syncing:', err);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await checkCalendarStatus();
      setStatus(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    status,
    isLoading,
    error,
    isSyncing,
    connect,
    disconnect,
    sync,
    refresh,
  };
}
```

**hooks/useInterviewForm.ts (MODIFICADO):**

```typescript
'use client';

import { useCallback, useState } from 'react';
import { Interview, CreateInterviewRequest, UpdateInterviewRequest } from '@/types/interview';
import { getUserTimezone, isValidFutureDate } from '@/lib/date-utils';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

interface FormErrors {
  [key: string]: string;
}

export function useInterviewForm(initialInterview?: Interview) {
  const [formData, setFormData] = useState<CreateInterviewRequest>({
    title: initialInterview?.title || '',
    candidateName: initialInterview?.candidateName || '',
    positionTitle: initialInterview?.positionTitle || '',
    scheduledDate: initialInterview?.scheduledDate?.split('T')[0] || '',
    scheduledTime: initialInterview?.scheduledTime || '',
    timezone: initialInterview?.timezone || getUserTimezone(),
    interviewers: initialInterview?.interviewers || [],
    notes: initialInterview?.notes || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.candidateName.trim()) {
      newErrors.candidateName = 'Candidate name is required';
    }

    if (!formData.positionTitle.trim()) {
      newErrors.positionTitle = 'Position title is required';
    }

    if (formData.scheduledDate) {
      if (!isValidFutureDate(formData.scheduledDate)) {
        newErrors.scheduledDate = 'Date must be in the future';
      }
    }

    if (formData.scheduledTime && !formData.scheduledDate) {
      newErrors.scheduledTime = 'Date is required when setting time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback(
    (field: keyof CreateInterviewRequest, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Limpiar error al editar
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleSubmit = useCallback(
    async (onSuccess?: (interview: Interview) => void) => {
      if (!validateForm()) {
        return;
      }

      try {
        setIsSubmitting(true);
        setSubmitError(null);

        const method = initialInterview ? 'PATCH' : 'POST';
        const url = initialInterview
          ? `${API_BASE}/interviews/${initialInterview.id}`
          : `${API_BASE}/interviews`;

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || `HTTP ${response.status}`);
        }

        const createdInterview = await response.json();
        onSuccess?.(createdInterview);

        return createdInterview;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Submit failed';
        setSubmitError(message);
        console.error('[useInterviewForm] Error submitting:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, initialInterview, validateForm]
  );

  const resetForm = useCallback(() => {
    setFormData({
      title: initialInterview?.title || '',
      candidateName: initialInterview?.candidateName || '',
      positionTitle: initialInterview?.positionTitle || '',
      scheduledDate: initialInterview?.scheduledDate?.split('T')[0] || '',
      scheduledTime: initialInterview?.scheduledTime || '',
      timezone: initialInterview?.timezone || getUserTimezone(),
      interviewers: initialInterview?.interviewers || [],
      notes: initialInterview?.notes || '',
    });
    setErrors({});
    setSubmitError(null);
  }, [initialInterview]);

  return {
    formData,
    errors,
    isSubmitting,
    submitError,
    handleInputChange,
    handleSubmit,
    resetForm,
    setFormData,
  };
}
```

---

## 5. COMPONENTES REACT

**components/interviews/GoogleCalendarConnect.tsx:**

```typescript
'use client';

import { useState } from 'react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function GoogleCalendarConnect() {
  const { connect, isLoading } = useGoogleCalendar();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleClick = async () => {
    setIsConnecting(true);
    try {
      await connect();
      // No llega aquí porque se redirige a Google
    } finally {
      setIsConnecting(false);
    }
  };

  const isButtonDisabled = isLoading || isConnecting;

  return (
    <button
      onClick={handleClick}
      disabled={isButtonDisabled}
      className="btn btn-primary"
      aria-label="Connect Google Calendar"
    >
      {isConnecting ? (
        <>
          <LoadingSpinner size="sm" />
          Connecting...
        </>
      ) : (
        <>
          <GoogleIcon />
          Connect Google Calendar
        </>
      )}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg
      className="w-5 h-5 inline mr-2"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 22c-5.5 0-10-4.5-10-10S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10zm3.5-9.5H8.5v3h3.5v3.5h2v-3.5h3.5v-2h-3.5V8h-2v4.5z" />
    </svg>
  );
}
```

**components/interviews/GoogleCalendarDisconnect.tsx:**

```typescript
'use client';

import { useState } from 'react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Toast } from '@/components/common/Toast';

interface Props {
  onDisconnected?: () => void;
}

export function GoogleCalendarDisconnect({ onDisconnected }: Props) {
  const { disconnect, isLoading } = useGoogleCalendar();
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setToast({ type: 'success', message: 'Google Calendar disconnected' });
      setShowConfirm(false);
      onDisconnected?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect';
      setToast({ type: 'error', message });
    }
  };

  if (showConfirm) {
    return (
      <>
        <div className="alert alert-warning">
          <p>Are you sure you want to disconnect Google Calendar?</p>
          <p className="text-sm mt-2">
            This won't delete events already created in Google Calendar.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="btn btn-danger"
            >
              Disconnect
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="btn btn-outline"
            >
              Cancel
            </button>
          </div>
        </div>
        {toast && <Toast type={toast.type} message={toast.message} />}
      </>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="btn btn-outline btn-danger"
    >
      Disconnect Google Calendar
    </button>
  );
}
```

**components/interviews/InterviewCalendarWidget.tsx:**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Interview } from '@/types/interview';
import { InterviewCalendarEvent } from '@/types/calendar';
import { getInterviewCalendarEvent } from '@/lib/google-calendar';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Toast } from '@/components/common/Toast';

interface Props {
  interview: Interview;
  onSync?: () => void;
}

export function InterviewCalendarWidget({ interview, onSync }: Props) {
  const { status } = useGoogleCalendar();
  const [calendarEvent, setCalendarEvent] = useState<InterviewCalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cargar evento al montar o cuando cambio la entrevista
  useEffect(() => {
    if (interview.id && status.isConnected) {
      loadCalendarEvent();
    }
  }, [interview.id, status.isConnected]);

  const loadCalendarEvent = async () => {
    try {
      setIsLoading(true);
      const event = await getInterviewCalendarEvent(interview.id);
      setCalendarEvent(event);
    } catch (error) {
      console.error('[InterviewCalendarWidget] Error loading event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await loadCalendarEvent();
      setToast({ type: 'success', message: 'Calendar synced' });
      onSync?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      setToast({ type: 'error', message });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!status.isConnected) {
    return (
      <div className="card bg-base-100">
        <div className="card-body">
          <h3 className="card-title text-sm">Google Calendar</h3>
          <p className="text-sm text-gray-600">
            Connect your Google Calendar to sync interview scheduling.
          </p>
        </div>
      </div>
    );
  }

  if (!interview.scheduledDate) {
    return (
      <div className="card bg-base-100">
        <div className="card-body">
          <h3 className="card-title text-sm">Google Calendar</h3>
          <p className="text-sm text-gray-600">
            Schedule a date and time to create a Google Calendar event.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card bg-base-100 border border-primary">
        <div className="card-body">
          <h3 className="card-title text-sm flex items-center gap-2">
            📅 Google Calendar
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : calendarEvent?.syncStatus === 'synced' ? (
            <>
              <div className="alert alert-success py-2">
                <span className="text-sm">✅ Event synced</span>
              </div>
              <a
                href={calendarEvent.googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline gap-2"
              >
                View in Google Calendar
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </>
          ) : calendarEvent?.syncStatus === 'pending' ? (
            <div className="alert alert-info py-2">
              <span className="text-sm">⏳ Syncing...</span>
            </div>
          ) : (
            <>
              <div className="alert alert-warning py-2">
                <span className="text-sm">⚠️ Sync failed - retrying</span>
              </div>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="btn btn-sm btn-outline"
              >
                {isSyncing ? 'Syncing...' : 'Retry Sync'}
              </button>
            </>
          )}
        </div>
      </div>
      {toast && <Toast type={toast.type} message={toast.message} />}
    </>
  );
}
```

**components/interviews/InterviewDatePicker.tsx:**

```typescript
'use client';

import { useCallback } from 'react';
import { formatDateForInput, formatTimeForInput, isValidFutureDate } from '@/lib/date-utils';

interface Props {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  minDate?: string;
  disabled?: boolean;
}

export function InterviewDatePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  minDate,
  disabled = false,
}: Props) {
  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onDateChange(e.target.value);
    },
    [onDateChange]
  );

  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onTimeChange(e.target.value);
    },
    [onTimeChange]
  );

  const today = new Date().toISOString().split('T')[0];
  const effectiveMinDate = minDate || today;

  return (
    <div className="form-control gap-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Date Input */}
        <div>
          <label className="label">
            <span className="label-text font-semibold">Interview Date</span>
          </label>
          <input
            type="date"
            value={formatDateForInput(date || today)}
            onChange={handleDateChange}
            min={effectiveMinDate}
            disabled={disabled}
            className="input input-bordered w-full"
            required
          />
          {date && !isValidFutureDate(date) && (
            <label className="label">
              <span className="label-text-alt text-error">
                Date must be in the future
              </span>
            </label>
          )}
        </div>

        {/* Time Input */}
        <div>
          <label className="label">
            <span className="label-text font-semibold">Interview Time</span>
          </label>
          <input
            type="time"
            value={formatTimeForInput(time)}
            onChange={handleTimeChange}
            disabled={disabled}
            className="input input-bordered w-full"
          />
        </div>
      </div>

      {/* Info Message */}
      {date && time && (
        <div className="alert alert-info">
          <span className="text-sm">
            Interview scheduled for {new Date(date).toLocaleDateString()} at {time}
          </span>
        </div>
      )}
    </div>
  );
}
```

**components/interviews/InterviewForm.tsx (MODIFICADO):**

```typescript
'use client';

import { useCallback, useEffect } from 'react';
import { Interview, CreateInterviewRequest } from '@/types/interview';
import { useInterviewForm } from '@/hooks/useInterviewForm';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { InterviewDatePicker } from './InterviewDatePicker';
import { Toast } from '@/components/common/Toast';

interface Props {
  interview?: Interview;
  onSuccess?: (interview: Interview) => void;
}

export function InterviewForm({ interview, onSuccess }: Props) {
  const {
    formData,
    errors,
    isSubmitting,
    submitError,
    handleInputChange,
    handleSubmit,
  } = useInterviewForm(interview);

  const { status: calendarStatus } = useGoogleCalendar();

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(onSuccess);
  }, [handleSubmit, onSuccess]);

  return (
    <form onSubmit={onSubmit} className="card bg-base-100 shadow-lg">
      <div className="card-body gap-6">
        <h2 className="card-title">
          {interview ? 'Edit Interview' : 'Schedule New Interview'}
        </h2>

        {/* Title */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Interview Title *</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Senior React Developer Round 1"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`input input-bordered ${errors.title ? 'input-error' : ''}`}
            disabled={isSubmitting}
          />
          {errors.title && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.title}</span>
            </label>
          )}
        </div>

        {/* Candidate Name */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Candidate Name *</span>
          </label>
          <input
            type="text"
            placeholder="John Doe"
            value={formData.candidateName}
            onChange={(e) => handleInputChange('candidateName', e.target.value)}
            className={`input input-bordered ${errors.candidateName ? 'input-error' : ''}`}
            disabled={isSubmitting}
          />
          {errors.candidateName && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.candidateName}</span>
            </label>
          )}
        </div>

        {/* Position Title */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Position *</span>
          </label>
          <input
            type="text"
            placeholder="Senior React Developer"
            value={formData.positionTitle}
            onChange={(e) => handleInputChange('positionTitle', e.target.value)}
            className={`input input-bordered ${errors.positionTitle ? 'input-error' : ''}`}
            disabled={isSubmitting}
          />
          {errors.positionTitle && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.positionTitle}</span>
            </label>
          )}
        </div>

        {/* Date & Time Picker */}
        <InterviewDatePicker
          date={formData.scheduledDate}
          time={formData.scheduledTime}
          onDateChange={(date) => handleInputChange('scheduledDate', date)}
          onTimeChange={(time) => handleInputChange('scheduledTime', time)}
          disabled={isSubmitting}
        />
        {errors.scheduledDate && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.scheduledDate}</span>
          </label>
        )}
        {errors.scheduledTime && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.scheduledTime}</span>
          </label>
        )}

        {/* Calendar Status Badge */}
        {formData.scheduledDate && (
          <div className="alert">
            <span className="text-sm">
              {calendarStatus.isConnected
                ? '✅ This interview will be synced to Google Calendar'
                : '⚠️ Google Calendar not connected - sync after connecting'}
            </span>
          </div>
        )}

        {/* Interviewers */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Interviewers</span>
          </label>
          <input
            type="text"
            placeholder="john@company.com, jane@company.com"
            value={formData.interviewers.join(', ')}
            onChange={(e) =>
              handleInputChange(
                'interviewers',
                e.target.value.split(',').map((s) => s.trim())
              )
            }
            className="input input-bordered"
            disabled={isSubmitting}
          />
          <label className="label">
            <span className="label-text-alt">Comma-separated emails</span>
          </label>
        </div>

        {/* Notes */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Notes</span>
          </label>
          <textarea
            placeholder="Additional notes about the interview..."
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="textarea textarea-bordered"
            rows={4}
            disabled={isSubmitting}
          />
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="alert alert-error">
            <span>{submitError}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="card-actions justify-end gap-3">
          <button
            type="button"
            className="btn btn-outline"
            disabled={isSubmitting}
            onClick={() => window.history.back()}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ Saving...' : interview ? 'Update Interview' : 'Schedule Interview'}
          </button>
        </div>
      </div>
    </form>
  );
}
```

---

## 6. ROUTE HANDLERS

**app/api/auth/google/callback/route.ts:**

```typescript
import { handleGoogleCallback } from '@/lib/google-calendar';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Google retorna error si el usuario rechaza
    if (error) {
      const errorDescription = searchParams.get('error_description') || error;
      return redirect(
        `/settings/calendar?error=${encodeURIComponent(errorDescription)}`
      );
    }

    // Validar que tenemos el código
    if (!code) {
      return redirect('/settings/calendar?error=missing_code');
    }

    // Intercambiar código por tokens (en backend)
    const result = await handleGoogleCallback(code, state || '');

    if (result.success) {
      return redirect('/settings/calendar?success=true');
    } else {
      return redirect(
        `/settings/calendar?error=${encodeURIComponent(result.error || result.message)}`
      );
    }
  } catch (error) {
    console.error('[OAuth Callback] Error:', error);
    const message = error instanceof Error ? error.message : 'Callback failed';
    return redirect(`/settings/calendar?error=${encodeURIComponent(message)}`);
  }
}
```

---

## 7. PÁGINAS

**app/interviews/[id]/page.tsx (MODIFICADO):**

```typescript
import { notFound } from 'next/navigation';
import { Interview } from '@/types/interview';
import { InterviewCalendarWidget } from '@/components/interviews/InterviewCalendarWidget';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Suspense } from 'react';

interface Props {
  params: { id: string };
}

async function getInterview(id: string): Promise<Interview> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/interviews/${id}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    notFound();
  }

  return res.json();
}

export default async function InterviewDetailPage({ params }: Props) {
  const interview = await getInterview(params.id);

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Interview Details */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h1 className="card-title text-2xl">{interview.title}</h1>
              <div className="divider" />

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Candidate</p>
                  <p className="font-semibold">{interview.candidateName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Position</p>
                  <p className="font-semibold">{interview.positionTitle}</p>
                </div>
                {interview.scheduledDate && (
                  <div>
                    <p className="text-sm text-gray-600">Scheduled</p>
                    <p className="font-semibold">
                      {new Date(interview.scheduledDate).toLocaleDateString()} at{' '}
                      {interview.scheduledTime}
                    </p>
                  </div>
                )}
                {interview.interviewers.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Interviewers</p>
                    <div className="flex flex-wrap gap-2">
                      {interview.interviewers.map((email) => (
                        <span key={email} className="badge badge-primary">
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {interview.notes && (
                <>
                  <div className="divider" />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Notes</p>
                    <p>{interview.notes}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Google Calendar Widget */}
        <div className="lg:col-span-1">
          <Suspense fallback={<LoadingSpinner />}>
            <InterviewCalendarWidget interview={interview} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
```

**app/settings/calendar/page.tsx:**

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { GoogleCalendarConnect } from '@/components/interviews/GoogleCalendarConnect';
import { GoogleCalendarDisconnect } from '@/components/interviews/GoogleCalendarDisconnect';
import { Toast } from '@/components/common/Toast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function CalendarSettingsPage() {
  const searchParams = useSearchParams();
  const { status, isLoading, error, refresh } = useGoogleCalendar();

  const successParam = searchParams.get('success');
  const errorParam = searchParams.get('error');

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Calendar Settings</h1>

      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Google Calendar Integration</h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : status.isConnected ? (
            <div className="space-y-4">
              <div className="alert alert-success">
                <span>✅ Connected to {status.email}</span>
              </div>
              <p className="text-sm text-gray-600">
                Your interview schedule is now synced with Google Calendar.
              </p>
              <GoogleCalendarDisconnect onDisconnected={refresh} />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Connect your Google Calendar to automatically sync interview
                schedules. Interviewers will receive calendar invitations.
              </p>
              <GoogleCalendarConnect />
            </div>
          )}

          {error && (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      {successParam === 'true' && (
        <Toast
          type="success"
          message="Google Calendar connected successfully!"
        />
      )}
      {errorParam && (
        <Toast type="error" message={`Error: ${decodeURIComponent(errorParam)}`} />
      )}
    </div>
  );
}
```

---

## 8. COMPONENTES COMUNES

**components/common/LoadingSpinner.tsx:**

```typescript
interface Props {
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
}

export function LoadingSpinner({ size = 'md', fullHeight = false }: Props) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={fullHeight ? 'flex justify-center items-center h-screen' : ''}>
      <div className={`animate-spin ${sizeClasses[size]}`}>
        <svg
          className="w-full h-full text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    </div>
  );
}
```

**components/common/Toast.tsx:**

```typescript
import { useEffect, useState } from 'react';

interface Props {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export function Toast({ type, message, duration = 5000 }: Props) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!isVisible) return null;

  const alertClass = {
    success: 'alert-success',
    error: 'alert-error',
    info: 'alert-info',
    warning: 'alert-warning',
  };

  return (
    <div className={`alert ${alertClass[type]} shadow-lg fixed bottom-4 right-4 max-w-sm z-50`}>
      <span>{message}</span>
    </div>
  );
}
```

---

## 9. VARIABLES DE ENTORNO

**.env.local:**

```env
# API
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000  # dev
# NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com  # prod
```

---

## 10. TESTING

**__tests__/hooks/useGoogleCalendar.test.ts:**

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import * as calendarLib from '@/lib/google-calendar';

jest.mock('@/lib/google-calendar');

describe('useGoogleCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load calendar status on mount', async () => {
    (calendarLib.checkCalendarStatus as jest.Mock).mockResolvedValue({
      isConnected: true,
      email: 'test@gmail.com',
      connectedAt: new Date().toISOString(),
    });

    const { result } = renderHook(() => useGoogleCalendar());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status.isConnected).toBe(true);
    expect(result.current.status.email).toBe('test@gmail.com');
  });

  it('should call getGoogleAuthUrl when connect is called', async () => {
    (calendarLib.getGoogleAuthUrl as jest.Mock).mockResolvedValue(
      'https://accounts.google.com/o/oauth2/v2/auth?...'
    );

    const { result } = renderHook(() => useGoogleCalendar());

    // Note: Este test es limitado porque connect redirige
    // En la práctica, deberías mockar window.location
  });
});
```

---

## 11. CHECKLIST DE IMPLEMENTACIÓN

**Fase 1: Setup**
- [ ] Crear estructura de carpetas
- [ ] Configurar types (calendar.ts)
- [ ] Crear lib/google-calendar.ts
- [ ] Crear lib/date-utils.ts

**Fase 2: Hooks y Servicios**
- [ ] Implementar useGoogleCalendar hook
- [ ] Modificar useInterviewForm hook
- [ ] Route handler callback

**Fase 3: Componentes**
- [ ] GoogleCalendarConnect
- [ ] GoogleCalendarDisconnect
- [ ] InterviewCalendarWidget
- [ ] InterviewDatePicker
- [ ] Modificar InterviewForm

**Fase 4: Páginas**
- [ ] Página settings/calendar
- [ ] Modificar interviews/[id]/page.tsx

**Fase 5: Testing & Polish**
- [ ] Tests unitarios
- [ ] Manejo de errores
- [ ] UX feedback (toasts, loading states)
- [ ] Responsive design

**Fase 6: Deployment**
- [ ] Configurar env vars en Vercel
- [ ] Testing en staging
- [ ] Deploy a producción