import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '@/lib/api'
import {
    fetchReportsCatalog,
    findReportForTemplate,
    findReportKeyForTemplate,
    isCatalogReportKey,
} from '@/lib/api/recruiter-reports-catalog'

vi.mock('@/lib/api', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}))

describe('recruiter-reports-catalog', () => {
    beforeEach(() => {
        vi.mocked(apiClient.get).mockReset()
    })

    const catalog = [
        { reportKey: 'vacancy-progress-by-client', name: 'Avance', linkedTemplate: null },
    ]

    it('isCatalogReportKey returns true only for catalog keys', () => {
        expect(isCatalogReportKey('vacancy-progress-by-client', catalog)).toBe(true)
        expect(isCatalogReportKey('executive-summary', catalog)).toBe(false)
        expect(isCatalogReportKey('', catalog)).toBe(false)
    })

    it('parses linkedTemplate from the catalog response', async () => {
        vi.mocked(apiClient.get).mockResolvedValue([
            {
                reportKey: 'vacancy-progress-by-client',
                name: 'Avance de vacantes',
                description: 'desc',
                endpoint: '/api/recruiter/reports/vacancy-progress-by-client',
                linkedTemplate: { templateId: 16, name: 'Mi plantilla PDF' },
            },
            {
                reportKey: 'candidate-status-by-stage',
                name: 'Estado de candidatos',
                linkedTemplate: null,
            },
        ])

        const items = await fetchReportsCatalog()
        expect(apiClient.get).toHaveBeenCalledWith('/api/recruiter/reports/catalog')
        expect(items).toHaveLength(2)
        expect(items[0].linkedTemplate).toEqual({
            templateId: '16',
            name: 'Mi plantilla PDF',
        })
        expect(items[0].endpoint).toBe('/api/recruiter/reports/vacancy-progress-by-client')
        expect(items[1].linkedTemplate).toBeNull()
    })

    it('parses the filters array from the catalog response', async () => {
        vi.mocked(apiClient.get).mockResolvedValue([
            {
                reportKey: 'vacancy-progress-by-client',
                name: 'Avance de vacantes',
                description: 'desc',
                endpoint: '/api/recruiter/reports/vacancy-progress-by-client',
                filters: [
                    { key: 'clientId', label: 'Cliente', type: 'select-company' },
                    { key: 'dateFrom', label: 'Desde', type: 'date' },
                    { invalidEntry: true },
                    'not-an-object',
                ],
                linkedTemplate: null,
            },
            {
                reportKey: 'candidate-status-by-stage',
                name: 'Estado de candidatos',
                linkedTemplate: null,
            },
        ])

        const items = await fetchReportsCatalog()
        expect(items).toHaveLength(2)
        expect(items[0].filters).toHaveLength(2)
        expect(items[0].filters?.[0]).toMatchObject({
            key: 'clientId',
            label: 'Cliente',
            type: 'select-company',
        })
        expect(items[0].filters?.[1]).toMatchObject({
            key: 'dateFrom',
            label: 'Desde',
            type: 'date',
        })
        expect(items[1].filters).toBeUndefined()
    })

    it('findReportForTemplate matches numeric and string template ids', () => {
        const items = [
            {
                reportKey: 'vacancy-progress-by-client',
                name: 'Avance',
                linkedTemplate: { templateId: '16', name: 'A' },
            },
            {
                reportKey: 'candidate-status-by-stage',
                name: 'Estado',
                linkedTemplate: null,
            },
        ]
        expect(findReportForTemplate(items, 16)?.reportKey).toBe(
            'vacancy-progress-by-client'
        )
        expect(findReportForTemplate(items, '16')?.reportKey).toBe(
            'vacancy-progress-by-client'
        )
        expect(findReportForTemplate(items, 17)).toBeNull()
        expect(findReportKeyForTemplate(items, 16)).toBe('vacancy-progress-by-client')
        expect(findReportKeyForTemplate(items, 99)).toBeNull()
    })
})
