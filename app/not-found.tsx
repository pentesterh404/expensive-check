import Link from 'next/link'

export default function NotFound() {
    return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h2 style={{ color: 'var(--ink)' }}>Page Not Found</h2>
            <p style={{ color: 'var(--muted)' }}>Could not find requested resource</p>
            <Link href="/dashboard" className="button" style={{ marginTop: 20, display: 'inline-block' }}>
                Return Dashboard
            </Link>
        </div>
    )
}
