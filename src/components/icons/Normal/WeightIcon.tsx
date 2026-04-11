interface WeightIconProps {
  color?: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
}

export default function WeightIcon({ color = 'currentColor', className, style, size }: WeightIconProps): React.JSX.Element {
  return (
    <svg
      className={className}
      style={size ? { width: size, height: size, ...style } : style}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 13.07 14.4"
    >
      <path fill={color} d="M12.99,10.76l-1.01-4.83c-.27-1.3-1.25-2.22-2.38-2.22h-.91c.21-.36.33-.78.33-1.22,0-1.38-1.12-2.5-2.5-2.5s-2.5,1.12-2.5,2.5c0,.45.13.86.33,1.22h-.91c-1.13,0-2.11.91-2.39,2.22L.07,10.76c-.21.99.03,2.02.62,2.75.46.57,1.09.89,1.77.89h8.15c.67,0,1.3-.31,1.76-.89.59-.73.83-1.76.62-2.75ZM5.31,2.5c0-.67.55-1.22,1.22-1.22s1.22.55,1.22,1.22-.55,1.22-1.22,1.22-1.22-.55-1.22-1.22ZM11.39,12.71c-.15.19-.41.41-.78.41H2.46c-.36,0-.62-.23-.78-.42-.35-.43-.49-1.08-.36-1.69l1.01-4.83c.15-.71.62-1.2,1.14-1.2h6.14c.52,0,.99.49,1.14,1.2l1.01,4.83c.13.61-.01,1.26-.36,1.69Z" />
    </svg>
  )
}
