# Archivio Prezzi Italia — stato verificabile

**Non è un prezzario nazionale completo.** Il catalogo elenca fonti istituzionali da acquisire. Nessun coefficiente geografico inventato.

## Fonti
- Lombardia 2026: XLS/XML/PDF; il PDF prevale in caso di discrepanza.
- Emilia-Romagna 2026: Excel/XML/PDF.
- Piemonte 2026: consultazione digitale.
- Toscana 2026: dataset per provincia, con formati XLS/XML.
- Prato/Pistoia 2026: intervalli tariffari orari autoriparazione (non prezzi obbligatori).

## Limiti
Le tariffe di autoriparazione sono **intervalli**; la API attuale di PRATICO memorizza un solo importo per voce. Il file JSON di esempio contiene solo i minimi rilevati ed è un esempio tecnico, **non va importato come prezzario di preventivazione**. Serve un modello min/max prima dell'uso in produzione.

I prezzari lavori pubblici non sono automaticamente listini di vendita al privato. Non mescolare voci che includono manodopera/spese generali/utile con ricarichi aggiuntivi. Per freelance non esiste un prezzario ufficiale nazionale equivalente: utilizzare benchmark privati dichiarati come tali e tariffe proprie.

## Importazione futura
1. Scaricare i dataset originali dalle fonti.
2. Verificare la licenza/condizioni di riutilizzo e la versione in vigore.
3. Conservare codice, descrizione completa, unità, importo, provincia/regione, anno, inclusioni/esclusioni, URL, checksum.
4. Normalizzare le categorie e gestire voci multiple/analisi prezzi.
5. Eseguire test su campioni confrontando il dato normalizzato con il PDF ufficiale.
6. Importare via area admin in lotti, mantenendo storico e provenienza.

**Non importare automaticamente dati inventati o non verificati.**
