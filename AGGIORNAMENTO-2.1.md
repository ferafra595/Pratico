# PRATICO 2.1 — rilascio incrementale

## Contenuto
- Percorsi Privato/Azienda realmente separati nella navigazione calcolatori. La scelta è persistente nel browser e modificabile dal pulsante dedicato.
- Preventivo: sconto percentuale o fisso per ogni riga, sconto globale, imprevisti, sicurezza/assicurazione, spese fuori base IVA; PDF di stampa e archivio continuano a usare i dati.
- Area ADMIN: diagnostica pubblica limitata a configurazione password sì/no e stato sessione; istruzioni precise per Cloudflare; uscita ADMIN separata. Non espone credenziali.
- Controlli aggiuntivi sui valori trasmessi al backend.
- Form preventivi adattati allo schermo mobile.

## Installazione
Sostituire solo i file nello ZIP nella radice del repository PRATICO, conservando percorsi e cartelle. Non serve una migrazione D1 per questa revisione. Controllare deployment Production e cancellare cache.

## Verifica ADMIN
Configurare `ADMIN_PASSWORD` come Secret in Cloudflare Pages > progetto > Settings > Variables and Secrets > Production (ambiente corrispondente al deployment). Rieseguire il deployment. Aprire `/account.html?admin=1` nello stesso dominio del sito e inserire ESATTAMENTE la password configurata. Usare `/api/admin/status` per controllare solamente `configured` e `authenticated`; non inserire la password in GitHub. Se il login ancora fallisce consultare la risposta di `/api/admin/login` in DevTools > Network e i log Functions. Attivare rate limiting sull’endpoint.

## Limiti da completare prima di definire il prodotto definitivo
- **Prezzari territoriali automatici**: NON completati. Sono disponibili importazioni ADMIN di fonti verificate. Sono necessari dataset regionali autentici, aggiornamento programmato, licenze, versioning e mappatura delle lavorazioni. Nessun prezzo regionale va inventato o ricavato da moltiplicatori arbitrari.
- **ADMIN totale**: gestisce statistiche, utenti in sola lettura, preventivi in sola lettura, import prezzari e impostazioni. Mancano CRUD pieno, ruoli, audit log, MFA e strumenti Stripe avanzati.
- **Preventivo**: calcolo complessivo, non ancora disciplina fiscale integrale (IVA differenziata per riga, ritenute, reverse charge, regimi fiscali e arrotondamenti ufficiali). Verificare con commercialista prima di usarlo come documento fiscale.
- **Calcolatori**: formule esistenti restano indicative; servono prove di dominio specifiche e nuovi wizard guidati per coprire ogni settore in profondità.
- I file hanno superato il controllo sintattico Node, ma non test end-to-end su Cloudflare/D1/Stripe.
