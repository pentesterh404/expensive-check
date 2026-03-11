'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="card" style={{ margin: 20, padding: 24, textAlign: 'center' }}>
            <h2 style={{ color: 'var(--error)' }}>Something went wrong!</h2>
            <p className="muted">{error.message || 'An unexpected error occurred.'}</p>
            <button
                className="button"
                style={{ marginTop: 16 }}
                onClick={() => reset()}
            >
                Try again
            </button>
        </div>
    )
}
