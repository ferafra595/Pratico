# PRATICO — versione iniziale deployabile su Cloudflare Pages

Sito statico HTML/CSS/JavaScript, senza dipendenze né build.

## Pubblicazione GitHub → Cloudflare Pages
1. Crea un repository GitHub e carica **il contenuto di questa cartella** nella radice del repository (`index.html`, `assets/`, ecc.).
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Seleziona il repository e configura **Framework preset: None**, **Build command: lascia vuoto**, **Build output directory: /** (radice del repository; se il pannello non accetta `/`, usa `.`).
4. Deploy. Apri l'indirizzo `*.pages.dev` e prova un calcolatore, un preventivo e la stampa PDF.

## Cosa funziona
- Homepage responsive, ricerca e filtro per 6 aree (Privati + 5 categorie professionali).
- 55+ strumenti specifici, costruiti su formule matematiche riutilizzabili; input modificabili e risultati immediati.
- Preventivo guidato: voci, quantità, costi, località, trasferta, adeguamento territoriale **manuale**, margine, IVA, acconto e saldo.
- Stampa/salvataggio PDF tramite la funzione di stampa del browser; esportazione JSON.
- Archivio locale dei preventivi, importazione/esportazione backup JSON.
- Nessun account necessario, nessun backend e nessun costo di API.

## Limiti da conoscere prima di usare il servizio pubblicamente
- **Prezzi territoriali automatici non implementati**: la località è registrata, ma il coefficiente è manuale. Non usare dati territoriali inventati. Per implementare listini verificati serviranno importazioni, fonti, licenze e aggiornamenti.
- **Non è un gestionale fiscale**: l'IVA è impostata dall'utente. Il PDF è un preventivo, non una fattura elettronica.
- **Premium, pagamenti, autenticazione, cloud, analytics e pubblicità non sono attivi**. Richiedono backend, account e adempimenti specifici. Non ci sono pagamenti fittizi.
- L'archivio è **solo nel browser corrente**. Cancellare i dati del browser lo elimina. Non è sincronizzato tra dispositivi. Fare backup.
- Le stime tecniche non sostituiscono progettazione, normativa, verifica di sicurezza o giudizio professionale. Nessun listino ufficiale incorporato.
- Il numero di calcolatori è elevato, ma alcune voci usano un **motore comune di stima** (per esempio ore × tariffa): non sono preventivi automatici per specifici modelli di auto o impianti.

## Architettura futura proposta
- Cloudflare Pages Functions + D1 per account e preventivi, R2 per allegati, provider di autenticazione, Stripe Checkout + webhook verificati per Premium, AdSense solo dopo approvazione.
- Database listini con fonte, area geografica, data, unità di misura e licenza; nessun automatismo di prezzo privo di fonti.
- Privacy policy, cookie/consensi ove richiesti, termini, gestione dei dati e verifica fiscale prima della monetizzazione.

## Test rapido
Avvia `python3 -m http.server 8000` nella cartella e visita `http://localhost:8000`. Per le funzioni ES modules non aprire direttamente il file `index.html` tramite `file://`.
