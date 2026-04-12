interface PlayIconProps {
  color?: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
}

export default function PlayIcon({ color = 'currentColor', className, style, size }: PlayIconProps): React.JSX.Element {
  return (
    <svg
      className={className}
      style={size ? { width: size, height: size, ...style } : style}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14.4 14.4"
    >
      <path fill={color} d="M5.9,9.99s-.09,0-.13-.01c-.26-.05-.47-.18-.62-.38-.15-.2-.22-.41-.22-.63v-3.51c0-.23.08-.46.22-.65.12-.13.36-.34.67-.37.26-.04.5.02.71.18l2.87,1.69c.23.12.4.33.47.56.09.23.08.48-.01.72-.1.25-.27.4-.39.49l-2.98,1.77c-.19.15-.46.15-.6.15ZM5.86,8.74s-.05.02-.07.05l.07-.05ZM6.2,5.89v2.65l2.24-1.33-2.24-1.32ZM8.77,7.01h0ZM5.83,5.67s0,0,0,0h0Z" />
      <path fill={color} d="M7.2,14.4c-3.97,0-7.2-3.23-7.2-7.2S3.23,0,7.2,0s7.2,3.23,7.2,7.2-3.23,7.2-7.2,7.2ZM7.2,1.28C3.93,1.28,1.28,3.93,1.28,7.2s2.66,5.92,5.92,5.92,5.92-2.66,5.92-5.92S10.47,1.28,7.2,1.28Z" />
    </svg>
  )
}
