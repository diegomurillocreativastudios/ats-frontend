import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PlantillaModal from '@/components/rrhh/PlantillaModal'
import { apiClient } from '@/lib/api'

// Mock the apiClient
vi.mock('@/lib/api', () => ({
    apiClient: {
        post: vi.fn(),
        put: vi.fn(),
    },
}))

describe('PlantillaModal', () => {
    it('should send the correct payload with $type and slug for a new notification template', async () => {
        const onSubmit = vi.fn()
        const onClose = vi.fn()

        render(
            <PlantillaModal
                isOpen={true}
                onClose={onClose}
                onSubmit={onSubmit}
            />
        )

        // Fill the form
        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Entrevista Programada' } })
        fireEvent.change(screen.getByLabelText(/Asunto/i), { target: { value: 'Nueva Cita' } })
        fireEvent.change(screen.getByLabelText(/Contenido/i), { target: { value: 'Hola {{name}}, tu entrevista es a las {{time}}.' } })

        // Submit
        fireEvent.click(screen.getByRole('button', { name: /Crear plantilla/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                '/api/Templates',
                expect.objectContaining({
                    $type: 'Notification',
                    name: 'Entrevista Programada',
                    subjectTemplate: 'Nueva Cita',
                    bodyTemplate: 'Hola {{name}}, tu entrevista es a las {{time}}.',
                    slug: 'entrevista-programada'
                })
            )
        })
    })

    it('should send the correct payload with $type and slug for a new document template', async () => {
        const onSubmit = vi.fn()
        const onClose = vi.fn()

        render(
            <PlantillaModal
                isOpen={true}
                onClose={onClose}
                onSubmit={onSubmit}
            />
        )

        // Change type to Document
        fireEvent.change(screen.getByLabelText(/Tipo de plantilla/i), { target: { value: 'Document' } })

        // Fill the form
        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Contrato de Empleo' } })
        fireEvent.change(screen.getByLabelText(/Plantilla de contenido/i), { target: { value: '<h1>Contrato</h1>' } })
        fireEvent.change(screen.getByLabelText(/Formato de salida/i), { target: { value: 'PDF' } })

        // Submit
        fireEvent.click(screen.getByRole('button', { name: /Crear plantilla/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                '/api/Templates',
                expect.objectContaining({
                    $type: 'Document',
                    name: 'Contrato de Empleo',
                    contentTemplate: '<h1>Contrato</h1>',
                    outputFormat: 'PDF',
                    slug: 'contrato-de-empleo'
                })
            )
        })
    })

    it('should send the correct payload with $type and slug for a new questionnaire template', async () => {
        const onSubmit = vi.fn()
        const onClose = vi.fn()

        render(
            <PlantillaModal
                isOpen={true}
                onClose={onClose}
                onSubmit={onSubmit}
            />
        )

        // Change type to Questionnaire
        fireEvent.change(screen.getByLabelText(/Tipo de plantilla/i), { target: { value: 'Questionnaire' } })

        // Fill the form
        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Encuesta Inicial' } })
        fireEvent.change(screen.getByLabelText(/Descripción/i), { target: { value: 'Por favor responde' } })
        fireEvent.click(screen.getByLabelText(/Es obligatorio/i))

        // Submit
        fireEvent.click(screen.getByRole('button', { name: /Crear plantilla/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                '/api/Templates',
                expect.objectContaining({
                    $type: 'Questionnaire',
                    name: 'Encuesta Inicial',
                    description: 'Por favor responde',
                    isMandatory: true,
                    slug: 'encuesta-inicial'
                })
            )
        })
    })
})
