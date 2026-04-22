interface PlayIconProps {
  color?: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
}

export default function PlayIcon({ color = 'currentColor', className, style, size }: PlayIconProps): React.JSX.Element {
  return (
    <svg className={className}
      style={size ? { width: size, height: size, ...style } : style} 
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14.12 14.379"
    >
      <path d="M8.679,4.218c-.351,0-.636.285-.636.636s.285.636.636.636c.573,0,1.038.465,1.038,1.038s-.465,1.039-1.038,1.039h-3.349l.168-.17c.247-.249.244-.652-.005-.899-.251-.249-.653-.244-.899.005l-1.281,1.295c-.247.249-.244.652.005.899.005.005.012.007.017.011l1.283,1.269c.124.123.286.184.447.184.164,0,.328-.063.452-.189.247-.249.244-.652-.005-.899l-.238-.235h3.403c1.274,0,2.31-1.037,2.31-2.311s-1.036-2.31-2.31-2.31Z" fill={color} />
      <path d="M9.077,0h-4.035C2.262,0,0,2.262,0,5.042v4.295c0,2.78,2.262,5.042,5.042,5.042h4.035c2.781,0,5.043-2.262,5.043-5.042v-4.295c0-2.78-2.262-5.042-5.043-5.042ZM9.077,13.107h-4.035c-2.079,0-3.77-1.691-3.77-3.77v-4.295c0-2.079,1.691-3.77,3.77-3.77h4.035c2.08,0,3.771,1.691,3.771,3.77v4.295c0,2.079-1.691,3.77-3.771,3.77Z" fill={color} />
    </svg>
  )
}
