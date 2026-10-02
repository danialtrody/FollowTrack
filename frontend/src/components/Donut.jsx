export default function Donut({ segments, size = 132, stroke = 14, centerValue, centerLabel }) {
  const r     = (size - stroke) / 2
  const C     = 2 * Math.PI * r
  const mid   = size / 2
  const live  = segments.filter(s => s.value > 0)
  const total = live.reduce((n, s) => n + s.value, 0)
  const gap   = live.length > 1 ? 3 : 0
  let offset  = 0

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`} width={size} height={size}
        role="img" aria-label={segments.map(s => `${s.label}: ${s.value}`).join(', ')}
      >
        <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--surface2)" strokeWidth={stroke} />
        {total > 0 && live.map(s => {
          const len  = (s.value / total) * C
          const draw = Math.max(len - gap, 0)
          const el = (
            <circle
              key={s.label}
              className="donut-seg"
              cx={mid} cy={mid} r={r} fill="none"
              stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${draw} ${C - draw}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${mid} ${mid})`}
              style={{ '--c': C }}
            />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="donut-center">
        <span className="donut-value">{centerValue}</span>
        <span className="donut-label">{centerLabel}</span>
      </div>
    </div>
  )
}
