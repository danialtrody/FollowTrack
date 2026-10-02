import { useEffect, useRef, useState } from 'react'

// Animates a number from its previous value to the new one (instant under reduced motion).
export default function CountUp({ value, duration = 700 }) {
  const [shown, setShown] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = value
      setShown(value)
      return
    }
    const from  = fromRef.current
    const start = performance.now()
    let raf
    const tick = now => {
      const t = Math.min((now - start) / duration, 1)
      const v = Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3)))
      fromRef.current = v
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <>{shown.toLocaleString()}</>
}
