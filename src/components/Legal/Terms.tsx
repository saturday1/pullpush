import styles from './Legal.module.scss'

export default function Terms(): React.ReactElement {
    return (
        <div className={styles.page}>
            <button className={styles.back} onClick={() => history.back()}>← Tillbaka</button>

            <div className={styles.title}>Användarvillkor</div>
            <div className={styles.updated}>Senast uppdaterad: 22 april 2026</div>

            <div className={styles.section}>
                <h2>Allmänt</h2>
                <p>Genom att använda PullPush accepterar du dessa villkor. Appen tillhandahålls av Joakim Borg, kontakt: <a href="mailto:joakim@cups.nu">joakim@cups.nu</a></p>
            </div>

            <div className={styles.section}>
                <h2>Tjänsten</h2>
                <p>PullPush är ett verktyg för att logga och planera träning och kost. Appen är inte ett medicinskt hjälpmedel. Rådfråga alltid läkare eller legitimerad dietist vid medicinska frågor.</p>
            </div>

            <div className={styles.section}>
                <h2>Konto</h2>
                <ul>
                    <li>Du ansvarar för att hålla dina inloggningsuppgifter säkra</li>
                    <li>Du får inte dela ditt konto med andra</li>
                    <li>Du måste vara minst 13 år för att använda appen</li>
                </ul>
            </div>

            <div className={styles.section}>
                <h2>Gratis period och prenumeration</h2>
                <p>Nya användare får 14 dagars gratis tillgång till Premium-funktioner. Efter det krävs en aktiv prenumeration för premiumfunktioner. Gratisfunktioner är alltid tillgängliga utan betalning.</p>
            </div>

            <div className={styles.section}>
                <h2>Ansvarsbegränsning</h2>
                <p>PullPush tillhandahålls i befintligt skick. Vi garanterar inte att appen alltid är felfri eller tillgänglig. Vi ansvarar inte för skador som uppstår till följd av användning av appen, inklusive träningsskador.</p>
            </div>

            <div className={styles.section}>
                <h2>Din data</h2>
                <p>Du äger din data. Vi behandlar den enligt vår <a href="/#/privacy">integritetspolicy</a>. Du kan när som helst begära radering av ditt konto och all data.</p>
            </div>

            <div className={styles.section}>
                <h2>Ändringar av tjänsten</h2>
                <p>Vi förbehåller oss rätten att ändra eller avveckla funktioner. Vid väsentliga ändringar meddelar vi i appen i god tid.</p>
            </div>

            <div className={styles.section}>
                <h2>Tillämplig lag</h2>
                <p>Dessa villkor regleras av svensk lag. Tvister avgörs i svensk domstol.</p>
            </div>

            <div className={styles.section}>
                <h2>Kontakt</h2>
                <p><a href="mailto:joakim@cups.nu">joakim@cups.nu</a></p>
            </div>
        </div>
    )
}
