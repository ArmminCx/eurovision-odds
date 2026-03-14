'use client'

export default function RPage() {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <span style={{
                fontFamily: 'Georgia, serif',
                fontSize: 'clamp(120px, 20vw, 220px)',
                color: '#fff',
                lineHeight: 1,
                userSelect: 'none',
            }}>R</span>
        </div>
    )
}
