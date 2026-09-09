import type { Metadata } from "next";
import { Container, Typography, Box, Paper, Divider } from "@mui/material";
import SiteHeader from "@/components/layout/SiteHeader";
import Link from "next/link";
import { SITE_HOST } from "@/lib/siteUrl";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Informativa Privacy",
  description:
    "Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR).",
  path: "/privacy",
});

const LAST_UPDATE = "20 maggio 2026";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="overline" color="primary" fontWeight={700}>
          Documento legale
        </Typography>
        <Typography
          variant="h3"
          fontWeight={800}
          sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.8rem", md: "2.4rem" } }}
        >
          Informativa sulla privacy
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Ai sensi degli artt. 13 e 14 del Regolamento UE 2016/679 (GDPR) e del D.Lgs. 196/2003 come
          modificato dal D.Lgs. 101/2018. Ultimo aggiornamento: {LAST_UPDATE}.
        </Typography>

        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 } }}>
          <Section title="1. Titolare del trattamento">
            <P>
              Il titolare del trattamento dei dati personali è{" "}
              <strong>ASD Karibu Baskin Montecchio Maggiore</strong>, codice fiscale 04301440246,
              con sede operativa presso il Polisportivo Gino Cosaro, Via del Vigo 11, 36075
              Montecchio Maggiore (VI), affiliata ENSI ETS nr. VEN10.
            </P>
            <P>
              Per qualsiasi richiesta inerente il trattamento dei dati personali è possibile
              contattare il titolare all&apos;indirizzo{" "}
              <a href="mailto:asdkaribubaskin@gmail.com">asdkaribubaskin@gmail.com</a>.
            </P>
          </Section>

          <Section title="2. Categorie di dati trattati">
            <P>
              Tramite il sito <strong>{SITE_HOST}</strong> raccogliamo e trattiamo le seguenti
              categorie di dati personali:
            </P>
            <Ul>
              <Li>
                <strong>Dati identificativi e di contatto:</strong> nome, cognome, indirizzo email,
                immagine del profilo (fornita da Google in fase di login).
              </Li>
              <Li>
                <strong>Dati sportivi:</strong> ruolo nel Baskin, eventuale variante, genere, data
                di nascita, appartenenza a squadra agonistica, presenze agli allenamenti,
                statistiche di partita (punti, falli, assist, rimbalzi), storico ruolo.
              </Li>
              <Li>
                <strong>Dati dei minori:</strong> nome, eventuale data di nascita, genere, ruolo
                sportivo dei figli iscritti dal genitore. Vedi sezione dedicata di seguito.
              </Li>
              <Li>
                <strong>Dati di iscrizione anonima:</strong> nome ed eventuale email forniti in fase
                di iscrizione a un allenamento senza account.
              </Li>
              <Li>
                <strong>Dati tecnici:</strong> indirizzo IP (utilizzato esclusivamente per
                rate-limiting e sicurezza), endpoint e chiavi crittografiche di sottoscrizione alle
                notifiche push del browser (se attivate).
              </Li>
              <Li>
                <strong>Dati di comunicazione:</strong> nome, email e contenuto del messaggio
                inviato tramite il modulo contatti.
              </Li>
              <Li>
                <strong>Dati di log e audit:</strong> registro delle azioni amministrative (cambio
                ruoli, eliminazioni) per finalità di sicurezza e responsabilità.
              </Li>
            </Ul>
          </Section>

          <Section title="3. Finalità e base giuridica del trattamento">
            <Ul>
              <Li>
                <strong>Gestione del rapporto associativo</strong> (iscrizione agli allenamenti,
                convocazioni, classifiche, organizzazione squadre): base giuridica art. 6, par. 1,
                lett. b) GDPR (esecuzione di un contratto / rapporto associativo) e f) (legittimo
                interesse dell&apos;associazione).
              </Li>
              <Li>
                <strong>Pubblicazione di statistiche sportive e classifiche</strong> sul sito,
                comprensive di nominativi: base giuridica art. 6, par. 1, lett. f) (legittimo
                interesse alla diffusione dell&apos;attività sportiva). L&apos;interessato può
                richiedere in qualsiasi momento la rimozione del proprio nominativo (vedi sez. 8).
              </Li>
              <Li>
                <strong>Invio di notifiche push e in-app</strong> relative ad allenamenti, partite e
                comunicazioni: base giuridica art. 6, par. 1, lett. a) (consenso esplicito, prestato
                attivando le notifiche dal browser e dal profilo utente).
              </Li>
              <Li>
                <strong>Riscontro a richieste tramite modulo contatti</strong>: base giuridica art.
                6, par. 1, lett. b) (misure precontrattuali su richiesta dell&apos;interessato).
              </Li>
              <Li>
                <strong>Sicurezza del sito, prevenzione abusi, audit</strong>: base giuridica art.
                6, par. 1, lett. f) (legittimo interesse del titolare).
              </Li>
              <Li>
                <strong>Adempimenti di legge</strong> (es. obblighi associativi ENSI ETS, fiscali):
                base giuridica art. 6, par. 1, lett. c).
              </Li>
            </Ul>
          </Section>

          <Section title="4. Trattamento dei dati dei minori">
            <P>
              L&apos;attività dell&apos;associazione coinvolge anche minori di età. I dati dei
              minori (nome, data di nascita, genere, ruolo sportivo, presenze, statistiche) sono
              inseriti e gestiti <strong>esclusivamente dal genitore o dal tutore legale</strong>{" "}
              tramite il proprio profilo. In sede di inserimento del minore il genitore è chiamato a{" "}
              <strong>confermare esplicitamente</strong> di essere titolare della responsabilità
              genitoriale e di prestare il consenso al trattamento dei dati del minore per le
              finalità sopra elencate.
            </P>
            <P>
              Ai sensi dell&apos;art. 2-quinquies del D.Lgs. 196/2003, il consenso digitale al
              trattamento dei dati personali del minore può essere prestato direttamente dal minore
              che abbia compiuto 14 anni; al di sotto di tale soglia il consenso è prestato dal
              soggetto esercente la responsabilità genitoriale.
            </P>
            <P>
              Il genitore può in qualunque momento modificare i dati del figlio o richiederne la
              cancellazione integrale dalla sezione &ldquo;Il mio profilo&rdquo; &gt; &ldquo;I miei
              figli&rdquo;.
            </P>
          </Section>

          <Section title="5. Destinatari e responsabili del trattamento">
            <P>
              I dati personali possono essere trattati, per conto del titolare, dai seguenti
              fornitori in qualità di responsabili del trattamento ex art. 28 GDPR:
            </P>
            <Ul>
              <Li>
                <strong>Vercel Inc.</strong> (hosting del sito e Vercel Analytics): server
                localizzati nell&apos;Unione Europea con possibili trasferimenti negli Stati Uniti,
                garantiti da clausole contrattuali standard della Commissione UE (SCC) e
                dall&apos;adesione al Data Privacy Framework UE-USA.
              </Li>
              <Li>
                <strong>Neon Inc.</strong> (database PostgreSQL gestito): regione UE; SCC.
              </Li>
              <Li>
                <strong>Google LLC</strong> (Google OAuth per il login, Google Maps per la mappa
                della sede): Data Privacy Framework UE-USA.
              </Li>
              <Li>
                <strong>Resend</strong> (invio email transazionali: modulo contatti e link di
                accesso al sito): SCC.
              </Li>
              <Li>
                <strong>Functional Software, Inc. (Sentry)</strong> (monitoraggio errori e
                registrazione tecnica delle sessioni, solo in caso di errore, a fini di
                diagnostica): Stati Uniti; SCC. La registrazione delle sessioni maschera per
                impostazione predefinita testi e dati inseriti nei moduli.
              </Li>
            </Ul>
            <P>
              I dati non sono diffusi né ceduti a terzi per finalità commerciali o di marketing.
              Possono essere comunicati ad autorità competenti su richiesta motivata.
            </P>
          </Section>

          <Section title="6. Trasferimenti extra UE">
            <P>
              Alcuni dei responsabili sopra indicati hanno sede negli Stati Uniti d&apos;America.
              Tali trasferimenti avvengono nel rispetto degli artt. 44 e ss. GDPR, sulla base di
              decisioni di adeguatezza (Data Privacy Framework UE-USA) e/o clausole contrattuali
              standard approvate dalla Commissione europea.
            </P>
          </Section>

          <Section title="7. Tempi di conservazione">
            <Ul>
              <Li>
                Dati dell&apos;account utente e dati sportivi: per tutta la durata del rapporto
                associativo e per i 24 mesi successivi all&apos;ultima attività, salvo richiesta
                anticipata di cancellazione.
              </Li>
              <Li>
                Statistiche storiche di partita e classifiche: conservate in forma nominativa per
                tutta la durata di iscrizione e in forma anonimizzata/aggregata per finalità
                statistiche e di memoria storica dell&apos;associazione.
              </Li>
              <Li>Notifiche in-app e push: 90 giorni (cron di pulizia settimanale).</Li>
              <Li>Iscrizioni anonime ad allenamenti: 24 mesi dalla data dell&apos;allenamento.</Li>
              <Li>Audit log delle azioni amministrative: 24 mesi per finalità di sicurezza.</Li>
              <Li>
                Messaggi del modulo contatti: il tempo necessario a evadere la richiesta e fino a 12
                mesi successivi per finalità di documentazione.
              </Li>
            </Ul>
          </Section>

          <Section title="8. Diritti dell'interessato">
            <P>
              In qualunque momento l&apos;interessato può esercitare i diritti previsti dagli artt.
              15-22 GDPR, e in particolare:
            </P>
            <Ul>
              <Li>
                diritto di <strong>accesso</strong> ai propri dati;
              </Li>
              <Li>
                diritto di <strong>rettifica</strong> dei dati inesatti;
              </Li>
              <Li>
                diritto alla <strong>cancellazione</strong> (&ldquo;diritto all&apos;oblio&rdquo;);
              </Li>
              <Li>
                diritto di <strong>limitazione</strong> del trattamento;
              </Li>
              <Li>
                diritto alla <strong>portabilità</strong> dei dati;
              </Li>
              <Li>
                diritto di <strong>opposizione</strong> al trattamento fondato sul legittimo
                interesse;
              </Li>
              <Li>
                diritto di <strong>revocare il consenso</strong> in qualsiasi momento, senza
                pregiudicare la liceità del trattamento basata sul consenso prestato prima della
                revoca;
              </Li>
              <Li>
                diritto di proporre <strong>reclamo</strong> al{" "}
                <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">
                  Garante per la protezione dei dati personali
                </a>
                .
              </Li>
            </Ul>
            <P>
              Per esercitare tali diritti è sufficiente scrivere a{" "}
              <a href="mailto:asdkaribubaskin@gmail.com">asdkaribubaskin@gmail.com</a> specificando
              &ldquo;Richiesta GDPR&rdquo; nell&apos;oggetto. L&apos;associazione risponderà entro
              30 giorni.
            </P>
          </Section>

          <Section title="9. Cookie e tecnologie simili">
            <P>
              Il sito utilizza esclusivamente <strong>cookie tecnici</strong> di sessione, necessari
              al funzionamento dell&apos;autenticazione (Auth.js) e alla memorizzazione delle
              preferenze (es. tema chiaro/scuro). Tali cookie non richiedono consenso preventivo ai
              sensi del provvedimento del Garante del 10 giugno 2021.
            </P>
            <P>
              Il sito impiega inoltre <strong>Vercel Analytics</strong>, un sistema di rilevazione
              statistica anonima delle visite, che non utilizza cookie persistenti né traccia gli
              utenti tra siti diversi.
            </P>
            <P>
              La pagina &ldquo;Contatti&rdquo; incorpora una mappa interattiva di{" "}
              <strong>Google Maps</strong>: caricando questo contenuto, Google può installare cookie
              di propria competenza. Per maggiori informazioni si rimanda alla{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                privacy policy di Google
              </a>
              .
            </P>
          </Section>

          <Section title="10. Misure di sicurezza">
            <P>
              Il titolare adotta misure tecniche e organizzative adeguate (art. 32 GDPR) tra cui:
              autenticazione via OAuth, gestione granulare dei ruoli, rate-limiting sulle API, audit
              logging delle azioni sensibili, cifratura in transito (HTTPS) e a riposo (database
              gestito).
            </P>
          </Section>

          <Section title="11. Modifiche all'informativa">
            <P>
              La presente informativa può essere aggiornata in qualsiasi momento. La versione
              vigente è sempre pubblicata a questo indirizzo, con indicazione della data di ultimo
              aggiornamento.
            </P>
          </Section>

          <Divider sx={{ my: 3 }} />

          <Typography variant="caption" color="text.secondary" display="block">
            Hai domande sulla privacy? Scrivici a{" "}
            <a href="mailto:asdkaribubaskin@gmail.com">asdkaribubaskin@gmail.com</a> oppure visita
            la pagina <Link href="/contatti">Contatti</Link>.
          </Typography>
        </Paper>
      </Container>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.75, mb: 1.5 }}>
      {children}
    </Typography>
  );
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <Box component="ul" sx={{ pl: 3, mb: 1.5, "& li": { mb: 0.75 } }}>
      {children}
    </Box>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <Typography component="li" variant="body2" color="text.primary" sx={{ lineHeight: 1.7 }}>
      {children}
    </Typography>
  );
}
