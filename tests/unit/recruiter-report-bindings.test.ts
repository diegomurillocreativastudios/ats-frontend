import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '@/lib/api'
import {
    deleteReportBinding,
    deleteReportBindingByTemplateId,
    describeReportBindingError,
    fetchReportBindingForTemplate,
    saveReportBinding,
    templateIdsMatch,
} from '@/lib/api/recruiter-report-bindings'

vi.mock('@/lib/api', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}))

describe('recruiter-report-bindings', () => {
    beforeEach(() => {
        vi.mocked(apiClient.get).mockReset()
        vi.mocked(apiClient.post).mockReset()
        vi.mocked(apiClient.put).mockReset()
        vi.mocked(apiClient.delete).mockReset()
    })

    it('templateIdsMatch compares numeric and string ids', () => {
        expect(templateIdsMatch(16, '16')).toBe(true)
        expect(templateIdsMatch('16', 16)).toBe(true)
        expect(templateIdsMatch('16', '17')).toBe(false)
    })

    it('finds binding when API returns a single object', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({
            templateId: 16,
            reportKey: 'vacancy-progress-by-client',
        })

        const binding = await fetchReportBindingForTemplate(16)
        expect(binding).toEqual({
            templateId: '16',
            reportKey: 'vacancy-progress-by-client',
        })
    })

    it('deleteReportBinding uses reportKey in the path', async () => {
        vi.mocked(apiClient.delete).mockResolvedValue({})
        await deleteReportBinding('vacancy-progress-by-client')
        expect(apiClient.delete).toHaveBeenCalledWith(
            '/api/recruiter/report-bindings/vacancy-progress-by-client'
        )
    })

    it('deleteReportBindingByTemplateId uses query param', async () => {
        vi.mocked(apiClient.delete).mockResolvedValue({})
        await deleteReportBindingByTemplateId(16)
        expect(apiClient.delete).toHaveBeenCalledWith(
            '/api/recruiter/report-bindings?templateId=16'
        )
    })

    it('saveReportBinding uses a single PUT when switching between two valid report keys', async () => {
        vi.mocked(apiClient.put).mockResolvedValue({})

        await saveReportBinding(
            { templateId: 16, reportKey: 'vacancy-progress-by-client' },
            { hadReportKey: 'candidate-status-by-stage' }
        )

        expect(apiClient.put).toHaveBeenCalledTimes(1)
        expect(apiClient.put).toHaveBeenCalledWith('/api/recruiter/report-bindings', {
            templateId: 16,
            reportKey: 'vacancy-progress-by-client',
        })
        expect(apiClient.delete).not.toHaveBeenCalled()
        expect(apiClient.post).not.toHaveBeenCalled()
    })

    it('saveReportBinding overwrites a stale (legacy) binding with one PUT call', async () => {
        vi.mocked(apiClient.put).mockResolvedValue({})

        await saveReportBinding(
            { templateId: 16, reportKey: 'vacancy-progress-by-client' },
            { hadReportKey: 'executive-summary' }
        )

        expect(apiClient.put).toHaveBeenCalledTimes(1)
        expect(apiClient.put).toHaveBeenCalledWith('/api/recruiter/report-bindings', {
            templateId: 16,
            reportKey: 'vacancy-progress-by-client',
        })
        expect(apiClient.delete).not.toHaveBeenCalled()
        expect(apiClient.post).not.toHaveBeenCalled()
    })

    it('saveReportBinding creates a brand new binding via PUT when there is no previous one', async () => {
        vi.mocked(apiClient.put).mockResolvedValue({})

        await saveReportBinding(
            { templateId: 16, reportKey: 'vacancy-progress-by-client' },
            { hadReportKey: '' }
        )

        expect(apiClient.put).toHaveBeenCalledTimes(1)
        expect(apiClient.put).toHaveBeenCalledWith('/api/recruiter/report-bindings', {
            templateId: 16,
            reportKey: 'vacancy-progress-by-client',
        })
        expect(apiClient.post).not.toHaveBeenCalled()
        expect(apiClient.delete).not.toHaveBeenCalled()
    })

    it('saveReportBinding is a no-op when the requested key matches the current one', async () => {
        await saveReportBinding(
            { templateId: 16, reportKey: 'vacancy-progress-by-client' },
            { hadReportKey: 'vacancy-progress-by-client' }
        )

        expect(apiClient.put).not.toHaveBeenCalled()
        expect(apiClient.post).not.toHaveBeenCalled()
        expect(apiClient.delete).not.toHaveBeenCalled()
    })

    it('saveReportBinding deletes the current binding when the requested key is empty', async () => {
        vi.mocked(apiClient.delete).mockResolvedValue({})

        await saveReportBinding(
            { templateId: 16, reportKey: '' },
            { hadReportKey: 'vacancy-progress-by-client' }
        )

        expect(apiClient.delete).toHaveBeenCalledWith(
            '/api/recruiter/report-bindings/vacancy-progress-by-client'
        )
        expect(apiClient.put).not.toHaveBeenCalled()
        expect(apiClient.post).not.toHaveBeenCalled()
    })

    it('saveReportBinding bubbles up a 409 when the target key is owned by another template', async () => {
        vi.mocked(apiClient.put).mockRejectedValue(
            Object.assign(new Error('Conflict'), { status: 409 })
        )

        await expect(
            saveReportBinding(
                { templateId: 16, reportKey: 'vacancy-progress-by-client' },
                { hadReportKey: 'candidate-status-by-stage' }
            )
        ).rejects.toMatchObject({ status: 409 })

        expect(apiClient.put).toHaveBeenCalledTimes(1)
        expect(apiClient.delete).not.toHaveBeenCalled()
        expect(apiClient.post).not.toHaveBeenCalled()
    })

    it('describeReportBindingError reflects the new 1:1 contract on 409', () => {
        const err = Object.assign(new Error('Conflict'), { status: 409 })
        expect(describeReportBindingError(err)).toMatch(/ya está vinculado a otra plantilla/i)
    })
})
