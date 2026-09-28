import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithIntl as render } from '@/tests/helpers/render-with-intl'
import PlantillaModal from '@/components/rrhh/PlantillaModal'
import { apiClient } from '@/lib/api'
import { fetchReportsCatalog } from '@/lib/api/recruiter-reports-catalog'
import { saveReportBinding } from '@/lib/api/recruiter-report-bindings'

vi.mock('@/lib/api', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}))

vi.mock('@/lib/api/recruiter-reports-catalog', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('@/lib/api/recruiter-reports-catalog')
    >()
    return {
        ...actual,
        fetchReportsCatalog: vi.fn(),
    }
})

vi.mock('@/lib/api/recruiter-report-bindings', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('@/lib/api/recruiter-report-bindings')
    >()
    return {
        ...actual,
        saveReportBinding: vi.fn(),
    }
})

/** Default catalog: nothing linked. */
const baseCatalog = [
    { reportKey: 'vacancy-progress-by-client', name: 'Avance de vacantes', linkedTemplate: null },
    { reportKey: 'candidate-status-by-stage', name: 'Estado de candidatos', linkedTemplate: null },
]

describe('PlantillaModal', () => {
    beforeEach(() => {
        vi.mocked(apiClient.post).mockReset()
        vi.mocked(apiClient.put).mockReset()
        vi.mocked(apiClient.get).mockReset()
        vi.mocked(fetchReportsCatalog).mockReset()
        vi.mocked(saveReportBinding).mockReset()

        vi.mocked(apiClient.post).mockResolvedValue({ id: 42 })
        vi.mocked(apiClient.put).mockResolvedValue({})
        vi.mocked(fetchReportsCatalog).mockResolvedValue(baseCatalog)
        vi.mocked(saveReportBinding).mockResolvedValue(undefined)
    })

    it('should send the correct payload with $type and slug for a new notification template', async () => {
        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        )

        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Entrevista Programada' } })
        fireEvent.change(screen.getByLabelText(/Asunto/i), { target: { value: 'Nueva Cita' } })
        fireEvent.change(screen.getByLabelText(/Contenido/i), { target: { value: 'Hola {{name}}, tu entrevista es a las {{time}}.' } })

        fireEvent.click(screen.getByRole('button', { name: /Crear plantilla/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                '/api/Templates',
                expect.objectContaining({
                    $type: 'Notification',
                    name: 'Entrevista Programada',
                    subjectTemplate: 'Nueva Cita',
                    bodyTemplate: 'Hola {{name}}, tu entrevista es a las {{time}}.',
                    slug: 'entrevista-programada',
                })
            )
        })
    })

    it('should send the correct payload with $type and slug for a new document template', async () => {
        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        )

        fireEvent.change(screen.getByLabelText(/Tipo de plantilla/i), { target: { value: 'Document' } })
        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Contrato de Empleo' } })
        fireEvent.change(screen.getByLabelText(/Plantilla de contenido/i), { target: { value: '<h1>Contrato</h1>' } })
        fireEvent.change(screen.getByLabelText(/Formato de salida/i), { target: { value: 'PDF' } })

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
                    isReport: false,
                })
            )
        })

        expect(saveReportBinding).not.toHaveBeenCalled()
    })

    it('should send isReport true and not include reportKey in the Templates payload', async () => {
        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        )

        fireEvent.change(screen.getByLabelText(/Tipo de plantilla/i), { target: { value: 'Document' } })
        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Reporte mensual' } })
        fireEvent.click(screen.getByLabelText(/Es plantilla de reporte/i))

        fireEvent.click(screen.getByRole('button', { name: /Crear plantilla/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                '/api/Templates',
                expect.objectContaining({
                    $type: 'Document',
                    name: 'Reporte mensual',
                    isReport: true,
                    isTechnicalSheet: false,
                    slug: 'reporte-mensual',
                })
            )
        })

        const sentPayload = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>
        expect(String(sentPayload.contentTemplate)).toContain('"reportKey"')
        expect(sentPayload.reportKey).toBeUndefined()
        expect(saveReportBinding).not.toHaveBeenCalled()
    })

    it('should send isTechnicalSheet true when the technical sheet checkbox is checked for a document template', async () => {
        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        )

        fireEvent.change(screen.getByLabelText(/Tipo de plantilla/i), { target: { value: 'Document' } })
        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Ficha tecnica CV' } })
        fireEvent.click(screen.getByLabelText(/Es plantilla de ficha técnica/i))

        fireEvent.click(screen.getByRole('button', { name: /Crear plantilla/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                '/api/Templates',
                expect.objectContaining({
                    $type: 'Document',
                    name: 'Ficha tecnica CV',
                    isTechnicalSheet: true,
                    slug: 'ficha-tecnica-cv',
                })
            )
        })
        const sentPayload = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>
        expect(String(sentPayload.contentTemplate)).toContain('"kind": "technical-sheet"')
    })

    it('should send the correct payload with $type and slug for a new questionnaire template', async () => {
        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        )

        fireEvent.change(screen.getByLabelText(/Tipo de plantilla/i), { target: { value: 'Questionnaire' } })
        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Encuesta Inicial' } })
        fireEvent.change(screen.getByLabelText(/Descripción/i), { target: { value: 'Por favor responde' } })
        fireEvent.click(screen.getByLabelText(/Es obligatorio/i))

        fireEvent.click(screen.getByRole('button', { name: /Crear plantilla/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                '/api/Templates',
                expect.objectContaining({
                    $type: 'Questionnaire',
                    name: 'Encuesta Inicial',
                    description: 'Por favor responde',
                    isMandatory: true,
                    slug: 'encuesta-inicial',
                })
            )
        })
    })

    it('should lazy-load the report catalog only when isReport becomes true', async () => {
        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        )

        fireEvent.change(screen.getByLabelText(/Tipo de plantilla/i), { target: { value: 'Document' } })

        expect(fetchReportsCatalog).not.toHaveBeenCalled()
        expect(screen.queryByLabelText(/Tipo de reporte/i)).not.toBeInTheDocument()

        fireEvent.click(screen.getByLabelText(/Es plantilla de reporte/i))

        await waitFor(() => {
            expect(fetchReportsCatalog).toHaveBeenCalledTimes(1)
        })

        const select = await screen.findByLabelText(/Tipo de reporte/i)
        await waitFor(() => {
            expect(select).not.toBeDisabled()
        })
        expect(screen.getByRole('option', { name: 'Avance de vacantes' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Estado de candidatos' })).toBeInTheDocument()
    })

    it('should clear reportKey and hide the select when isReport is unchecked', async () => {
        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        )

        fireEvent.change(screen.getByLabelText(/Tipo de plantilla/i), { target: { value: 'Document' } })
        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Doc reporte' } })
        fireEvent.change(screen.getByLabelText(/Plantilla de contenido/i), { target: { value: '<p>R</p>' } })

        fireEvent.click(screen.getByLabelText(/Es plantilla de reporte/i))
        const select = (await screen.findByLabelText(/Tipo de reporte/i)) as HTMLSelectElement
        await waitFor(() => expect(select).not.toBeDisabled())
        fireEvent.change(select, { target: { value: 'vacancy-progress-by-client' } })

        fireEvent.click(screen.getByLabelText(/Es plantilla de reporte/i))
        expect(screen.queryByLabelText(/Tipo de reporte/i)).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: /Crear plantilla/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                '/api/Templates',
                expect.objectContaining({ isReport: false })
            )
        })
        expect(saveReportBinding).not.toHaveBeenCalled()
    })

    it('should save binding after creating a new template when a reportKey is selected', async () => {
        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        )

        fireEvent.change(screen.getByLabelText(/Tipo de plantilla/i), { target: { value: 'Document' } })
        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Reporte vacantes' } })
        fireEvent.change(screen.getByLabelText(/Plantilla de contenido/i), { target: { value: '<p>V</p>' } })
        fireEvent.click(screen.getByLabelText(/Es plantilla de reporte/i))

        const select = (await screen.findByLabelText(/Tipo de reporte/i)) as HTMLSelectElement
        await waitFor(() => expect(select).not.toBeDisabled())
        fireEvent.change(select, { target: { value: 'vacancy-progress-by-client' } })

        fireEvent.click(screen.getByRole('button', { name: /Crear plantilla/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalled()
        })
        await waitFor(() => {
            expect(saveReportBinding).toHaveBeenCalledWith(
                {
                    templateId: 42,
                    reportKey: 'vacancy-progress-by-client',
                },
                { hadReportKey: '' }
            )
        })
    })

    it('should preload existing binding from the catalog linkedTemplate when editing', async () => {
        vi.mocked(fetchReportsCatalog).mockResolvedValue([
            {
                reportKey: 'vacancy-progress-by-client',
                name: 'Avance de vacantes',
                linkedTemplate: null,
            },
            {
                reportKey: 'candidate-status-by-stage',
                name: 'Estado de candidatos',
                linkedTemplate: { templateId: '7', name: 'Reporte editado' },
            },
        ])

        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                editingTemplate={{
                    id: 7,
                    type: 'Document',
                    name: 'Reporte editado',
                    contentTemplate: '<p>X</p>',
                    outputFormat: 'PDF',
                    isReport: true,
                    isTechnicalSheet: false,
                }}
            />
        )

        const select = (await screen.findByLabelText(/Tipo de reporte/i)) as HTMLSelectElement
        await waitFor(() => {
            expect(select.value).toBe('candidate-status-by-stage')
        })
    })

    it('should disable reports already linked to other templates', async () => {
        vi.mocked(fetchReportsCatalog).mockResolvedValue([
            {
                reportKey: 'vacancy-progress-by-client',
                name: 'Avance de vacantes',
                linkedTemplate: { templateId: '999', name: 'Otra plantilla' },
            },
            {
                reportKey: 'candidate-status-by-stage',
                name: 'Estado de candidatos',
                linkedTemplate: null,
            },
        ])

        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                editingTemplate={{
                    id: 7,
                    type: 'Document',
                    name: 'Reporte editado',
                    contentTemplate: '<p>X</p>',
                    outputFormat: 'PDF',
                    isReport: true,
                    isTechnicalSheet: false,
                }}
            />
        )

        const select = (await screen.findByLabelText(/Tipo de reporte/i)) as HTMLSelectElement
        await waitFor(() => expect(select).not.toBeDisabled())

        const lockedOption = within(select).getByRole('option', {
            name: /Avance de vacantes — ya vinculado a "Otra plantilla"/i,
        }) as HTMLOptionElement
        expect(lockedOption.disabled).toBe(true)

        const freeOption = within(select).getByRole('option', {
            name: 'Estado de candidatos',
        }) as HTMLOptionElement
        expect(freeOption.disabled).toBe(false)
    })

    it('should save binding when the report changes in edit mode', async () => {
        vi.mocked(fetchReportsCatalog).mockResolvedValue([
            {
                reportKey: 'vacancy-progress-by-client',
                name: 'Avance de vacantes',
                linkedTemplate: null,
            },
            {
                reportKey: 'candidate-status-by-stage',
                name: 'Estado de candidatos',
                linkedTemplate: { templateId: '9', name: 'Reporte editado' },
            },
        ])

        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                editingTemplate={{
                    id: 9,
                    type: 'Document',
                    name: 'Reporte editado',
                    contentTemplate: '<p>X</p>',
                    outputFormat: 'PDF',
                    isReport: true,
                    isTechnicalSheet: false,
                }}
            />
        )

        const select = (await screen.findByLabelText(/Tipo de reporte/i)) as HTMLSelectElement
        await waitFor(() => expect(select.value).toBe('candidate-status-by-stage'))

        fireEvent.change(select, { target: { value: 'vacancy-progress-by-client' } })
        fireEvent.click(screen.getByRole('button', { name: /Actualizar plantilla/i }))

        await waitFor(() => {
            expect(apiClient.put).toHaveBeenCalled()
        })
        await waitFor(() => {
            expect(saveReportBinding).toHaveBeenCalledWith(
                {
                    templateId: 9,
                    reportKey: 'vacancy-progress-by-client',
                },
                { hadReportKey: 'candidate-status-by-stage' }
            )
        })
    })

    it('should clear binding when isReport is unchecked on edit', async () => {
        vi.mocked(fetchReportsCatalog).mockResolvedValue([
            {
                reportKey: 'vacancy-progress-by-client',
                name: 'Avance de vacantes',
                linkedTemplate: { templateId: '11', name: 'Reporte editado' },
            },
            {
                reportKey: 'candidate-status-by-stage',
                name: 'Estado de candidatos',
                linkedTemplate: null,
            },
        ])

        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                editingTemplate={{
                    id: 11,
                    type: 'Document',
                    name: 'Reporte editado',
                    contentTemplate: '<p>X</p>',
                    outputFormat: 'PDF',
                    isReport: true,
                    isTechnicalSheet: false,
                }}
            />
        )

        const select = (await screen.findByLabelText(/Tipo de reporte/i)) as HTMLSelectElement
        await waitFor(() => expect(select.value).toBe('vacancy-progress-by-client'))

        fireEvent.click(screen.getByLabelText(/Es plantilla de reporte/i))
        fireEvent.click(screen.getByRole('button', { name: /Actualizar plantilla/i }))

        await waitFor(() => {
            expect(apiClient.put).toHaveBeenCalled()
        })
        await waitFor(() => {
            expect(saveReportBinding).toHaveBeenCalledWith(
                { templateId: 11, reportKey: '' },
                { hadReportKey: 'vacancy-progress-by-client' }
            )
        })
    })

    it('should show a friendly conflict snackbar when the binding call returns 409', async () => {
        vi.mocked(saveReportBinding).mockRejectedValue(
            Object.assign(new Error('Conflict'), { status: 409 })
        )
        const onSnackbar = vi.fn()

        render(
            <PlantillaModal
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                onSnackbar={onSnackbar}
            />
        )

        fireEvent.change(screen.getByLabelText(/Tipo de plantilla/i), { target: { value: 'Document' } })
        fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Reporte conflicto' } })
        fireEvent.change(screen.getByLabelText(/Plantilla de contenido/i), { target: { value: '<p>F</p>' } })
        fireEvent.click(screen.getByLabelText(/Es plantilla de reporte/i))

        const select = (await screen.findByLabelText(/Tipo de reporte/i)) as HTMLSelectElement
        await waitFor(() => expect(select).not.toBeDisabled())
        fireEvent.change(select, { target: { value: 'vacancy-progress-by-client' } })

        fireEvent.click(screen.getByRole('button', { name: /Crear plantilla/i }))

        await waitFor(() => {
            expect(onSnackbar).toHaveBeenCalledWith(
                expect.stringMatching(/ya está vinculado/i),
                'warning'
            )
        })
    })
})
