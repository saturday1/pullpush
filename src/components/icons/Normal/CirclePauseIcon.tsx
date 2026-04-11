interface CirclePauseIconProps {
  color?: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
}

export default function CirclePauseIcon({ color = 'currentColor', className, style, size }: CirclePauseIconProps): React.JSX.Element {
  return (
    <svg
      className={className}
      style={size ? { width: size, height: size, ...style } : style}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14.4 14.4"
    >
      <path fill={color} d="M7.2,14.4c-3.97,0-7.2-3.23-7.2-7.2S3.23,0,7.2,0s7.2,3.23,7.2,7.2-3.23,7.2-7.2,7.2ZM7.2,1.28C3.93,1.28,1.28,3.93,1.28,7.2s2.66,5.92,5.92,5.92,5.92-2.66,5.92-5.92S10.47,1.28,7.2,1.28Z" />
      <path fill={color} d="M5.65,9.38c-.35,0-.64-.29-.64-.64v-3.1c0-.35.29-.64.64-.64s.64.29.64.64v3.1c0,.35-.29.64-.64.64Z" />
      <path fill={color} d="M8.75,9.39c-.35,0-.64-.29-.64-.64v-3.1c0-.35.29-.64.64-.64s.64.29.64.64v3.1c0,.35-.29.64-.64.64Z" />
    </svg>
  )
}
