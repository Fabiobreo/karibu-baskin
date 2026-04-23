import {
  Html, Head, Body, Container, Section, Text, Hr, Link, Preview, Heading, Row, Column,
} from "@react-email/components";

interface Props {
  senderName: string;
  senderEmail: string;
  message: string;
}

const ORANGE = "#E65100";
const BG = "#f4f4f5";
const CARD_BG = "#ffffff";
const TEXT_MAIN = "#1a1a1a";
const TEXT_MUTED = "#6b7280";

export default function ContactNotificationEmail({ senderName, senderEmail, message }: Props) {
  return (
    <Html lang="it">
      <Head />
      <Preview>Nuovo messaggio da {senderName} tramite il sito</Preview>
      <Body style={{ backgroundColor: BG, fontFamily: "Inter, Arial, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", padding: "0 16px" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEXT_MAIN, borderRadius: "10px 10px 0 0", padding: "24px 32px", textAlign: "center" as const }}>
            <Text style={{ color: ORANGE, fontWeight: 800, fontSize: 20, margin: 0, letterSpacing: "-0.3px" }}>
              Karibu Baskin
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, margin: "4px 0 0", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
              Montecchio Maggiore
            </Text>
          </Section>

          {/* Card */}
          <Section style={{ backgroundColor: CARD_BG, padding: "32px", borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb" }}>
            <Heading as="h2" style={{ color: TEXT_MAIN, fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
              Nuovo messaggio dal sito
            </Heading>
            <Text style={{ color: TEXT_MUTED, fontSize: 14, margin: "0 0 24px" }}>
              Hai ricevuto un nuovo messaggio tramite il form di contatto.
            </Text>

            {/* Mittente */}
            <Section style={{ backgroundColor: BG, borderRadius: 8, padding: "16px 20px", marginBottom: 24 }}>
              <Row>
                <Column>
                  <Text style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 2px" }}>
                    Nome
                  </Text>
                  <Text style={{ color: TEXT_MAIN, fontSize: 15, fontWeight: 600, margin: 0 }}>
                    {senderName}
                  </Text>
                </Column>
              </Row>
              <Hr style={{ borderColor: "#e5e7eb", margin: "12px 0" }} />
              <Row>
                <Column>
                  <Text style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 2px" }}>
                    Email
                  </Text>
                  <Link href={`mailto:${senderEmail}`} style={{ color: ORANGE, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                    {senderEmail}
                  </Link>
                </Column>
              </Row>
            </Section>

            {/* Messaggio */}
            <Text style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 8px" }}>
              Messaggio
            </Text>
            <Section style={{ borderLeft: `3px solid ${ORANGE}`, paddingLeft: 16, marginBottom: 24 }}>
              <Text style={{ color: TEXT_MAIN, fontSize: 15, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" as const }}>
                {message}
              </Text>
            </Section>

            <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 20px" }} />

            <Text style={{ color: TEXT_MUTED, fontSize: 13, margin: 0 }}>
              Rispondi direttamente a questa email per contattare {senderName}.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ backgroundColor: "#f9fafb", borderRadius: "0 0 10px 10px", border: "1px solid #e5e7eb", borderTop: "none", padding: "16px 32px", textAlign: "center" as const }}>
            <Text style={{ color: TEXT_MUTED, fontSize: 12, margin: 0 }}>
              ASD Karibu Baskin Montecchio Maggiore · C.F. 04301440246
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
