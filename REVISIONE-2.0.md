# Revisione PRATICO 2.0 — 19 ottobre 2026

## Correzioni applicate
- Separata l’identità dell’utente dalla sessione amministratore; admin e Premium non sono più confusi.
- Logout chiude la sessione utente e la sessione amministratore.
- Controllo Premium anche sull’eliminazione dei preventivi cloud.
- Controllo di formato/dimensioni dei preventivi inviati al database.
- Risultati non finiti o negativi dei calcolatori non vengono aggiunti al preventivo.
- Ricerca listini include anche il codice della voce.
- Import prezzi senza nuovi NULL in città; migrazione 0003 per bonifica e unicità dei record.
- Bloccata creazione di un secondo checkout quando Premium è già attivo.
- Eliminati file segnaposto non funzionali.

## Da fare su Cloudflare dopo aggiornamento
1. Pubblica tutti i file nella radice del repository (non la cartella contenitore).
2. Esegui `npx wrangler d1 migrations apply pratico-db --remote` o applica manualmente 0003 alla D1 corretta.
3. Controlla D1 binding DB, variabile ADMIN_PASSWORD, Stripe e configura rate limit per login.
4. Svuota la cache del browser e controlla che il commit GitHub corrisponda al deploy di Pages.

## Limitazioni ancora presenti
- Non testabile qui il sistema reale Cloudflare D1 / Stripe / AdSense senza credenziali e ambiente remoto.
- Manca un test end-to-end reale delle sessioni e webhook in produzione.
- Nessun prezzario regionale ufficiale incluso; le stime illustrative non rappresentano tariffe verificate.
- Protezione antibruteforce / verifica email / gestione consenso cookies devono essere completate prima del lancio pubblico.
