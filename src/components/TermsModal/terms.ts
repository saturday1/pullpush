import { APP_NAME } from '../../constants/app'

export type TermsSection = { heading: string; text: string }
export type TermsContent = { title: string; sections: TermsSection[]; updated: string }

export const terms: Record<string, TermsContent> = {
    sv: {
        title: 'Användarvillkor',
        sections: [
            {
                heading: 'Allmänt',
                text: `Genom att använda ${APP_NAME} accepterar du dessa villkor. Appen tillhandahålls av Joakim Borg.`,
            },
            {
                heading: 'Tjänsten',
                text: `${APP_NAME} är ett verktyg för att logga och planera träning och kost. Appen är inte ett medicinskt hjälpmedel. Rådfråga alltid läkare eller legitimerad dietist vid medicinska frågor.`,
            },
            {
                heading: 'Konto',
                text: 'Du ansvarar för att hålla dina inloggningsuppgifter säkra. Du får inte dela ditt konto med andra. Du måste vara minst 13 år för att använda appen.',
            },
            {
                heading: 'Gratis period och prenumeration',
                text: 'Nya användare får 30 dagars gratis tillgång till Premium-funktioner. Efter det krävs en aktiv prenumeration för premiumfunktioner. Gratisfunktioner är alltid tillgängliga utan betalning.',
            },
            {
                heading: 'Ansvarsbegränsning',
                text: `${APP_NAME} tillhandahålls i befintligt skick. Vi garanterar inte att appen alltid är felfri eller tillgänglig. Vi ansvarar inte för skador som uppstår till följd av användning av appen, inklusive träningsskador.`,
            },
            {
                heading: 'Din data',
                text: 'Du äger din data. Vi behandlar den enligt vår integritetspolicy. Du kan när som helst begära radering av ditt konto och all data.',
            },
            {
                heading: 'Ändringar av tjänsten',
                text: 'Vi förbehåller oss rätten att ändra eller avveckla funktioner. Vid väsentliga ändringar meddelar vi i appen i god tid.',
            },
            {
                heading: 'Tillämplig lag',
                text: 'Dessa villkor regleras av svensk lag. Tvister avgörs i svensk domstol.',
            },
            {
                heading: 'Kontakt',
                text: 'Använd kontaktformuläret i appen.',
            },
        ],
        updated: 'Senast uppdaterad: 22 april 2026',
    },
}
