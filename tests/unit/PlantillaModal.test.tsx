import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    beforeEach(() => {
        vi.mocked(apiClient.post).mockClear()
        vi.mocked(apiClient.put).mockClear()
    })

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
                    slug: 'contrato-de-empleo',
                    isTechnicalSheet: false,
                    isReport: false
                })
            )
        })
    })

    it('should send isReport true when the report checkbox is checked for a document template', async () => {
        const onSubmit = vi.fn()
        const onClose = vi.fn()

        render(
            <PlantillaModal
                isOpen={true}
                onClose={onClose}
                onSubmit={onSubmit}
            />
        )

        fireEvent.change(screen.getByLabelText(/Tipo de plantilla/i), { target: { value: 'Document' } })
        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Reporte mensual' } })
        fireEvent.change(screen.getByLabelText(/Plantilla de contenido/i), { target: { value: '<h1>R</h1>' } })
        fireEvent.click(screen.getByLabelText(/Es plantilla de reporte/i))

        fireEvent.click(screen.getByRole('button', { name: /Crear plantilla/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                '/api/Templates',
                expect.objectContaining({
                    $type: 'Document',
                    name: 'Reporte mensual',
                    contentTemplate: '<h1>R</h1>',
                    isReport: true,
                    isTechnicalSheet: false,
                    slug: 'reporte-mensual'
                })
            )
        })
    })

    it('should send isTechnicalSheet true when the technical sheet checkbox is checked for a document template', async () => {
        const onSubmit = vi.fn()
        const onClose = vi.fn()

        render(
            <PlantillaModal
                isOpen={true}
                onClose={onClose}
                onSubmit={onSubmit}
            />
        )

        fireEvent.change(screen.getByLabelText(/Tipo de plantilla/i), { target: { value: 'Document' } })
        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Ficha tecnica CV' } })
        fireEvent.change(screen.getByLabelText(/Plantilla de contenido/i), { target: { value: '<p>FT</p>' } })
        fireEvent.click(screen.getByLabelText(/Es plantilla de ficha técnica/i))

        fireEvent.click(screen.getByRole('button', { name: /Crear plantilla/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                '/api/Templates',
                expect.objectContaining({
                    $type: 'Document',
                    name: 'Ficha tecnica CV',
                    contentTemplate: '<p>FT</p>',
                    isTechnicalSheet: true,
                    slug: 'ficha-tecnica-cv'
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
