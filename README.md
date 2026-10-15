# PRATICO — Cloudflare Pages + D1 + Stripe

## Stato reale
Questa versione contiene il sito con i calcolatori originali, il preventivo guidato, la ricerca prezzi territoriali **solo su dati verificati importati**, registrazione/login, sessioni HttpOnly, archivio cloud Premium, pannello amministratore base, Stripe Checkout + Billing Portal + webhook firmati, e caricamento AdSense opzionale.

**Non è pronta alla monetizzazione pubblica senza configurazione e verifiche.** Non sono inclusi listini ufficiali precaricati, né è stato collegato un account Stripe/AdSense. Il sistema non scarica autonomamente prezzari regionali: un amministratore deve importarli e mantenerli aggiornati, previa verifica delle licenze. Nessuna stima territoriale viene inventata.

## Pubblicazione con GitHub e Cloudflare Pages
1. Estrai la ZIP e carica **il contenuto della cartella** nella radice del repository GitHub.
2. Cloudflare Dashboard > Workers & Pages > Create > Pages > Connect to Git. Framework: None, build command vuoto, output `.`.
3. In Cloudflare > Storage & databases > D1 crea un database `pratico-db`, copia il database ID in `wrangler.toml` e pubblica il commit aggiornato.
4. Esegui la migrazione nel terminale locale autenticato con Wrangler: `npx wrangler d1 migrations apply pratico-db --remote` (oppure incolla il contenuto di `migrations/0001_init.sql` nella console D1).
5. Nel progetto Pages > Settings > Bindings verifica che il binding D1 si chiami **DB**. Configura le variabili/segreti nelle impostazioni del progetto e ridistribuisci.
6. Imposta `ADMIN_EMAIL` all'indirizzo che userai per il primo account admin **prima di registrarlo**. La registrazione con quell'indirizzo conferisce il ruolo admin: mantieni segreta la configurazione, limita l'accesso e non usare un indirizzo condiviso. In produzione è consigliato creare l'admin con una procedura manuale protetta, non tramite registrazione pubblica.
7. Per Stripe crea un prodotto Premium e un prezzo ricorrente, poi imposta i segreti `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`. Webhook URL: `https://TUO-DOMINIO/api/stripe/webhook`; eventi: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Attiva Billing Portal in Stripe. Esegui prove complete in modalità test.
8. Per AdSense (dopo approvazione) imposta `ADSENSE_CLIENT_ID` e `ADSENSE_SLOT`. Prima del rilascio serve una CMP adeguata: l'attuale controllo consenso è solo dimostrativo, **non** una CMP certificata.

## Esempio importazione prezzi
Usa `esempio-importazione.json` come schema **NON COME PREZZARIO**. Inserisci esclusivamente voci reali, importabili e verificate. L'admin incolla un JSON con `source` (id, title, url HTTPS, publisher, edition, license, verified_at) e `items` (region, category, code, description, unit, amount, province/city facoltative). Max 100 voci per chiamata. Le fonti e l'anno sono mostrati nella ricerca. Per prezzi regionali la regione è obbligatoria e il prezzo non viene adattato automaticamente per città.

## Limitazioni importanti / prima del lancio
- Password protette con PBKDF2 e cookie HttpOnly Secure SameSite=Lax; **mancano** verifica email, recupero password, protezione antibruteforce distribuita, MFA admin, audit e un sistema di cancellazione dati completo. Prima del lancio pubblico integra Cloudflare Turnstile/rate limiting e un provider di autenticazione gestito o implementa i controlli mancanti.
- Stripe: verifica webhook HMAC e deduplica eventi; l'ordine degli eventi e la riconciliazione dello stato richiedono test aggiuntivi. I permessi Premium sono applicati sul server.
- L'archivio cloud salva fino a 100 preventivi visualizzati, ma non supporta modifica in-place. La versione locale funziona indipendentemente.
- **Non c'è un'importazione automatica dai siti regionali**, non c'è un algoritmo di prezzi territoriali stimati. I prezzari pubblici non equivalgono ai prezzi di mercato privati.
- Nessuna analytics esterna o dashboard ricavi Stripe integrata; il pannello admin conta utenti, sottoscrizioni, preventivi e voci prezzo.
- Pubblicità: serve approvazione AdSense, consenso idoneo, privacy/cookie policy e verifica normativa prima dell'attivazione. Non configurare gli ID pubblicitari prima di avere completato gli adempimenti.
- Il PDF è prodotto tramite stampa browser. Il preventivo non è una fattura elettronica.
- Calcolatori e IVA sono stime basate sui dati dell'utente, non progettazione tecnica o consulenza fiscale.
- Nessun file `.env` o segreto deve essere caricato su GitHub.

## Test consigliati
Registrazione, login, logout, sessione scaduta, accesso admin negato a utente normale, query prezzi vuota, import prezzi reali, checkout Stripe test, webhook test, rinnovo e cancellazione, salvataggio Premium, blocco archivio per Free, mobile e stampa PDF.


## Archivio prezzi e limiti
Consultare `GUIDA-PREZZI.md` e `catalogo-fonti.json` per le fonti verificate e i limiti di copertura. Il catalogo non equivale all’importazione integrale dei listini regionali.

## Struttura semplificata
I file HTML/CSS/JS e i dati di riferimento sono nella radice. Le uniche cartelle sono `functions/api` (obbligatoria per le API Cloudflare Pages) e `migrations` (migrazioni D1). Carica **il contenuto** della cartella nella radice del repository, non la cartella contenitore.
