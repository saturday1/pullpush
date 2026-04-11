interface MinimizeIconProps {
  color?: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
}

export default function MinimizeIcon({ color = 'currentColor', className, style, size }: MinimizeIconProps): React.JSX.Element {
  return (
    <svg
      className={className}
      style={size ? { width: size, height: size, ...style } : style}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14.12 14.38"
    >
      <path fill={color} d="M9.08,0h-4.04C2.26,0,0,2.26,0,5.04v4.29c0,2.78,2.26,5.04,5.04,5.04h4.04c2.78,0,5.04-2.26,5.04-5.04v-4.29c0-2.78-2.26-5.04-5.04-5.04ZM9.08,13.11h-4.04c-2.08,0-3.77-1.69-3.77-3.77v-4.29c0-2.08,1.69-3.77,3.77-3.77h4.04c2.08,0,3.77,1.69,3.77,3.77v4.29c0,2.08-1.69,3.77-3.77,3.77Z" />
      <path fill={color} d="M9.92,9.35h-5.72c-.35,0-.64.28-.64.64s.28.64.64.64h5.72c.35,0,.64-.28.64-.64s-.28-.64-.64-.64Z" />
    </svg>
  )
}
