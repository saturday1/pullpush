import { APP_NAME } from '../../constants/app'

export type PrivacySection = {
    heading: string
    text?: string
    items?: string[]
    text2?: string
}

export type PrivacyContent = {
    title: string
    updated: string
    sections: PrivacySection[]
}

export const privacy: Record<string, PrivacyContent> = {
    sv: {
        title: 'Integritetspolicy',
        updated: 'Senast uppdaterad: 22 april 2026',
        sections: [
            {
                heading: 'Vem vi är',
                text: `${APP_NAME} är en tränings- och kostapp utvecklad av Joakim Borg.`,
            },
            {
                heading: 'Vilken data vi samlar in',
                text: 'Vi samlar in följande uppgifter när du använder appen:',
                items: [
                    'E-postadress (för inloggning)',
                    'Profiluppgifter: namn, födelsedag, längd, startvikt, telefonnummer',
                    'Träningsdata: pass, övningar, set, reps, vikter, vilotider',
                    'Kostdata: måltider, makronäringsämnen, kalorier',
                    'Kroppsviktslogg',
                    'Enhetstokens för push-notiser (Live Activity)',
                ],
            },
            {
                heading: 'Hur vi använder din data',
                text: 'Din data används uteslutande för att:',
                items: [
                    'Visa och spara dina tränings- och kostuppgifter i appen',
                    'Beräkna rekommendationer (t.ex. kaloribehov, progression)',
                    'Skicka träningsnotiser via Live Activity',
                ],
                text2: 'Vi säljer aldrig din data till tredje part och använder den inte för reklam.',
            },
            {
                heading: 'Lagring och säkerhet',
                text: 'Din data lagras säkert hos Supabase (EU-region). Åtkomst skyddas av Row Level Security — du kan bara se din egen data. Vi använder krypterad anslutning (HTTPS/TLS) för all kommunikation.',
            },
            {
                heading: 'Dina rättigheter (GDPR)',
                text: 'Du har rätt att:',
                items: [
                    'Begära ut all data vi har om dig',
                    'Rätta felaktiga uppgifter',
                    'Radera ditt konto och all tillhörande data',
                ],
                text2: 'Skicka en förfrågan via kontaktformuläret i appen så hanterar vi det inom 30 dagar.',
            },
            {
                heading: 'Tredjepartstjänster',
                text: 'Appen använder följande tjänster:',
                items: [
                    'Supabase — databas och autentisering',
                    'Apple Push Notification Service — Live Activity-notiser',
                ],
            },
            {
                heading: 'Ändringar',
                text: 'Vi kan uppdatera den här policyn. Vid väsentliga ändringar meddelar vi dig i appen. Fortsatt användning efter ändring innebär att du accepterar den nya policyn.',
            },
            {
                heading: 'Kontakt',
                text: 'Använd kontaktformuläret i appen.',
            },
        ],
    },
}
