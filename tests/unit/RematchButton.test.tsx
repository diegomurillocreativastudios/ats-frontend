import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RematchButton from '@/components/rrhh/RematchButton'
import { apiClient } from '@/lib/api'

vi.mock('@/lib/api', () => ({
    apiClient: {
        request: vi.fn(),
    },
}))

describe('RematchButton', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should hide button immediately after successful rematch', async () => {
        vi.mocked(apiClient.request).mockResolvedValueOnce({})
        const onSnackbar = vi.fn()

        render(
            <RematchButton
                vacancyId="vacancy-1"
                needsRematch={true}
                onSnackbar={onSnackbar}
            />
        )

        const rematchButton = screen.getByRole('button', { name: /re-ajustar matches/i })
        fireEvent.click(rematchButton)

        await waitFor(() => {
            expect(apiClient.request).toHaveBeenCalledWith('/api/recruiter/vacancies/vacancy-1/rematch', {
                method: 'POST',
            })
        })

        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /re-ajustar matches/i })).not.toBeInTheDocument()
        })
    })

    it('should keep button visible when rematch request fails', async () => {
        vi.mocked(apiClient.request).mockRejectedValueOnce(new Error('Network error'))
        const onSnackbar = vi.fn()

        render(
            <RematchButton
                vacancyId="vacancy-2"
                needsRematch={true}
                onSnackbar={onSnackbar}
            />
        )

        const rematchButton = screen.getByRole('button', { name: /re-ajustar matches/i })
        fireEvent.click(rematchButton)

        await waitFor(() => {
            expect(apiClient.request).toHaveBeenCalled()
        })

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /re-ajustar matches/i })).toBeVisible()
        })
    })
})
