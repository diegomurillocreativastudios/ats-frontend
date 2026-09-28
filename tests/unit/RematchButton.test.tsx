import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import RematchButton from '@/components/rrhh/RematchButton'
import { apiClient } from '@/lib/api'
import esMessages from '@/messages/es.json'

vi.mock('@/lib/api', () => ({
    apiClient: {
        request: vi.fn(),
    },
}))

function renderRematch(ui: React.ReactNode) {
    return render(
        <NextIntlClientProvider locale="es" messages={esMessages}>
            {ui}
        </NextIntlClientProvider>
    )
}

describe('RematchButton', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should hide button immediately after successful rematch', async () => {
        vi.mocked(apiClient.request).mockResolvedValueOnce({})
        const onSnackbar = vi.fn()

        renderRematch(
            <RematchButton
                vacancyId="vacancy-1"
                needsRematch={true}
                onSuccess={vi.fn()}
                onSnackbar={onSnackbar}
            />
        )

        const rematchButton = screen.getByRole('button', { name: /reajustar emparejamientos/i })
        fireEvent.click(rematchButton)

        await waitFor(() => {
            expect(apiClient.request).toHaveBeenCalledWith('/api/recruiter/vacancies/vacancy-1/rematch', {
                method: 'POST',
            })
        })

        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /reajustar emparejamientos/i })).not.toBeInTheDocument()
        })
    })

    it('should keep button visible when rematch request fails', async () => {
        vi.mocked(apiClient.request).mockRejectedValueOnce(new Error('Network error'))
        const onSnackbar = vi.fn()

        renderRematch(
            <RematchButton
                vacancyId="vacancy-2"
                needsRematch={true}
                onSuccess={vi.fn()}
                onSnackbar={onSnackbar}
            />
        )

        const rematchButton = screen.getByRole('button', { name: /reajustar emparejamientos/i })
        fireEvent.click(rematchButton)

        await waitFor(() => {
            expect(apiClient.request).toHaveBeenCalled()
        })

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /reajustar emparejamientos/i })).toBeVisible()
        })
    })
})
