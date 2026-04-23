import {
  Html, Head, Body, Container, Section, Text, Hr, Preview, Heading,
} from "@react-email/components";

interface Props {
  senderName: string;
  message: string;
}

const ORANGE = "#E65100";
const BG = "#f4f4f5";
const CARD_BG = "#ffffff";
const TEXT_MAIN = "#1a1a1a";
const TEXT_MUTED = "#6b7280";

export default function ContactConfirmationEmail({ senderName, message }: Props) {
  return (
    <Html lang="it">
      <Head />
      <Preview>Abbiamo ricevuto il tuo messaggio — ti risponderemo presto!</Preview>
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
            <Heading as="h2" style={{ color: TEXT_MAIN, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>
              Ciao {senderName}! 👋
            </Heading>
            <Text style={{ color: TEXT_MAIN, fontSize: 15, lineHeight: 1.7, margin: "0 0 8px" }}>
              Abbiamo ricevuto il tuo messaggio e ti risponderemo il prima possibile.
            </Text>
            <Text style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
              Nel frattempo, se hai bisogno di contattarci direttamente puoi scriverci a{" "}
              <span style={{ color: ORANGE, fontWeight: 600 }}>asdkaribubaskin@gmail.com</span>{" "}
              oppure chiamare Elisa al <span style={{ fontWeight: 600 }}>349 297 2703</span>.
            </Text>

            <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 24px" }} />

            {/* Riepilogo messaggio */}
            <Text style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 8px" }}>
              Il tuo messaggio
            </Text>
            <Section style={{ backgroundColor: BG, borderRadius: 8, padding: "16px 20px", marginBottom: 0 }}>
              <Text style={{ color: TEXT_MAIN, fontSize: 14, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" as const }}>
                {message}
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ backgroundColor: "#f9fafb", borderRadius: "0 0 10px 10px", border: "1px solid #e5e7eb", borderTop: "none", padding: "16px 32px", textAlign: "center" as const }}>
            <Text style={{ color: TEXT_MUTED, fontSize: 12, margin: "0 0 4px" }}>
              ASD Karibu Baskin Montecchio Maggiore · C.F. 04301440246
            </Text>
            <Text style={{ color: "#9ca3af", fontSize: 11, margin: 0 }}>
              Hai ricevuto questa email perché hai compilato il form su karibubaskin.it
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
