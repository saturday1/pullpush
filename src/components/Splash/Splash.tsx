import Logo from '../Logo/Logo'
import styles from './Splash.module.scss'

export default function Splash(): React.ReactElement {
  return (
    <div className={styles.splash}>
      <Logo color="#fff" className={styles.logo} />
    </div>
  )
}
