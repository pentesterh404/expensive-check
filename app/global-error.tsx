'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="vi">
            <body>
                <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
                    <h2 style={{ color: '#e11d48' }}>Critical Error</h2>
                    <p style={{ color: '#64748b' }}>{error.message || 'A critical error occurred at the root level.'}</p>
                    <button
                        onClick={() => reset()}
                        style={{
                            marginTop: 20,
                            padding: '10px 20px',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer'
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
