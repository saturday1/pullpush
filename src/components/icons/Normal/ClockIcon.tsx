interface ClockIconProps {
  color?: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
}

export default function ClockIcon({ color = 'currentColor', className, style, size }: ClockIconProps): React.JSX.Element {
  return (
    <svg
      className={className}
      style={size ? { width: size, height: size, ...style } : style}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14.432 14.432"
      overflow="visible"
    >
      <path fill={color} d="M7.216,14.432c-3.979,0-7.216-3.237-7.216-7.216S3.237,0,7.216,0s7.216,3.237,7.216,7.216-3.237,7.216-7.216,7.216ZM7.216,1.278C3.942,1.278,1.278,3.942,1.278,7.216s2.664,5.938,5.938,5.938,5.938-2.664,5.938-5.938S10.49,1.278,7.216,1.278Z" />
      <path fill={color} d="M10.1,6.773h-2.441v-2.639c0-.353-.286-.639-.639-.639s-.639.286-.639.639v3.08c0,.035.015.066.02.099-.005.034-.02.064-.02.099,0,.353.286.639.639.639h3.08c.353,0,.639-.286.639-.639s-.286-.639-.639-.639Z" />
    </svg>
  )
}
