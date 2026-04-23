import styles from './Legal.module.scss'

export default function PrivacyPolicy(): React.ReactElement {
    return (
        <div className={styles.page}>
            <button className={styles.back} onClick={() => history.back()}>← Tillbaka</button>

            <div className={styles.title}>Integritetspolicy</div>
            <div className={styles.updated}>Senast uppdaterad: 22 april 2026</div>

            <div className={styles.section}>
                <h2>Vem vi är</h2>
                <p>PullPush är en tränings- och kostapp utvecklad av Joakim Borg. Kontakt: <a href="mailto:joakim@cups.nu">joakim@cups.nu</a></p>
            </div>

            <div className={styles.section}>
                <h2>Vilken data vi samlar in</h2>
                <p>Vi samlar in följande uppgifter när du använder appen:</p>
                <ul>
                    <li>E-postadress (för inloggning)</li>
                    <li>Profiluppgifter: namn, födelsedag, längd, startvikt, telefonnummer</li>
                    <li>Träningsdata: pass, övningar, set, reps, vikter, vilotider</li>
                    <li>Kostdata: måltider, makronäringsämnen, kalorier</li>
                    <li>Kroppsviktslogg</li>
                    <li>Enhetstokens för push-notiser (Live Activity)</li>
                </ul>
            </div>

            <div className={styles.section}>
                <h2>Hur vi använder din data</h2>
                <p>Din data används uteslutande för att:</p>
                <ul>
                    <li>Visa och spara dina tränings- och kostuppgifter i appen</li>
                    <li>Beräkna rekommendationer (t.ex. kaloribehov, progression)</li>
                    <li>Skicka träningsnotiser via Live Activity</li>
                </ul>
                <p>Vi säljer aldrig din data till tredje part och använder den inte för reklam.</p>
            </div>

            <div className={styles.section}>
                <h2>Lagring och säkerhet</h2>
                <p>Din data lagras säkert hos Supabase (EU-region). Åtkomst skyddas av Row Level Security — du kan bara se din egen data. Vi använder krypterad anslutning (HTTPS/TLS) för all kommunikation.</p>
            </div>

            <div className={styles.section}>
                <h2>Dina rättigheter (GDPR)</h2>
                <p>Du har rätt att:</p>
                <ul>
                    <li>Begära ut all data vi har om dig</li>
                    <li>Rätta felaktiga uppgifter</li>
                    <li>Radera ditt konto och all tillhörande data</li>
                </ul>
                <p>Skicka en förfrågan till <a href="mailto:joakim@cups.nu">joakim@cups.nu</a> så hanterar vi det inom 30 dagar.</p>
            </div>

            <div className={styles.section}>
                <h2>Tredjepartstjänster</h2>
                <p>Appen använder följande tjänster:</p>
                <ul>
                    <li><strong>Supabase</strong> — databas och autentisering</li>
                    <li><strong>Apple Push Notification Service</strong> — Live Activity-notiser</li>
                </ul>
            </div>

            <div className={styles.section}>
                <h2>Ändringar</h2>
                <p>Vi kan uppdatera den här policyn. Vid väsentliga ändringar meddelar vi dig i appen. Fortsatt användning efter ändring innebär att du accepterar den nya policyn.</p>
            </div>

            <div className={styles.section}>
                <h2>Kontakt</h2>
                <p><a href="mailto:joakim@cups.nu">joakim@cups.nu</a></p>
            </div>
        </div>
    )
}
