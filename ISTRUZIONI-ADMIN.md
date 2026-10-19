# PRATICO — Nuovo pannello ADMIN

Caricare su GitHub i file e le cartelle di questo ZIP mantenendo i percorsi. Poi attendere il deployment Cloudflare Pages. L’accesso continua con la stessa password ADMIN_PASSWORD e viene reindirizzato su `/admin.html`.

## Cosa funziona
- Dashboard statistiche e diagnostica configurazione
- Upload reale da file JSON, validazione preliminare e importazione in blocchi fino a 100 righe
- Elenco prezzi e modifica di descrizione, unità e importo, eliminazione
- Elenco fonti e attivazione/disattivazione
- Pubblicità: abilitazione e scelta posizionamento (effettiva solo se AdSense è configurato)
- Utenti e abbonamenti: consultazione, preventivi cloud: consultazione ed eliminazione
- Impostazioni regionali e avviso pubblico

## Limiti importanti
- AdSense richiede gli ID Cloudflare, approvazione e consenso; il pannello non crea campagne o account pubblicitari.
- Il sistema non scarica automaticamente prezzari dalle regioni: importare solo file con provenienza e licenza verificati.
- Le tabelle mostrano al massimo 1000 prezzi, 500 fonti, 200 utenti/preventivi. Per grandi dataset servirà paginazione server.
- Nessun test end-to-end è stato eseguito sull’ambiente Production reale. Effettuare backup D1 prima di cancellazioni e provare su Preview se possibile.
- Non è necessaria una migrazione D1.
