import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Preview,
  Heading,
  Button,
  Link,
} from "@react-email/components";

interface Props {
  url: string;
  /** Ore di validità del link, mostrate all'utente. */
  expiresInHours?: number;
  locale?: string;
}

const ORANGE = "#E65100";
const BG = "#f4f4f5";
const CARD_BG = "#ffffff";
const TEXT_MAIN = "#1a1a1a";
const TEXT_MUTED = "#6b7280";

const COPY = {
  it: {
    preview: "Il tuo link di accesso a Karibu Baskin",
    heading: "Accedi a Karibu Baskin",
    body: "Clicca il pulsante qui sotto per entrare. Non serve nessuna password.",
    cta: "Accedi",
    expiry: (h: number) =>
      `Il link è valido per ${h} ${h === 1 ? "ora" : "ore"} e può essere usato una sola volta.`,
    fallback: "Se il pulsante non funziona, copia e incolla questo indirizzo nel browser:",
    ignore:
      "Se non hai richiesto tu questo accesso, ignora questa email: nessuno può entrare senza il link.",
    footer: "Hai ricevuto questa email perché è stato richiesto un accesso a karibubaskin.it",
  },
  en: {
    preview: "Your sign-in link for Karibu Baskin",
    heading: "Sign in to Karibu Baskin",
    body: "Click the button below to sign in. No password needed.",
    cta: "Sign in",
    expiry: (h: number) =>
      `This link is valid for ${h} ${h === 1 ? "hour" : "hours"} and can be used once.`,
    fallback: "If the button does not work, copy and paste this address into your browser:",
    ignore:
      "If you did not request this sign-in, you can ignore this email. Nobody can get in without the link.",
    footer: "You received this email because a sign-in was requested on karibubaskin.it",
  },
};

export default function MagicLinkEmail({ url, expiresInHours = 24, locale = "it" }: Props) {
  const c = locale === "en" ? COPY.en : COPY.it;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{c.preview}</Preview>
      <Body
        style={{
          backgroundColor: BG,
          fontFamily: "Inter, Arial, sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Container style={{ maxWidth: 560, margin: "40px auto", padding: "0 16px" }}>
          {/* Header */}
          <Section
            style={{
              backgroundColor: TEXT_MAIN,
              borderRadius: "10px 10px 0 0",
              padding: "24px 32px",
              textAlign: "center" as const,
            }}
          >
            <Text
              style={{
                color: ORANGE,
                fontWeight: 800,
                fontSize: 20,
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              Karibu Baskin
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                margin: "4px 0 0",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
              }}
            >
              Montecchio Maggiore
            </Text>
          </Section>

          {/* Card */}
          <Section
            style={{
              backgroundColor: CARD_BG,
              padding: "32px",
              borderLeft: "1px solid #e5e7eb",
              borderRight: "1px solid #e5e7eb",
            }}
          >
            <Heading
              as="h2"
              style={{ color: TEXT_MAIN, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}
            >
              {c.heading}
            </Heading>
            <Text style={{ color: TEXT_MAIN, fontSize: 15, lineHeight: 1.7, margin: "0 0 24px" }}>
              {c.body}
            </Text>

            <Section style={{ textAlign: "center" as const, margin: "0 0 24px" }}>
              <Button
                href={url}
                style={{
                  backgroundColor: ORANGE,
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: 700,
                  textDecoration: "none",
                  borderRadius: 8,
                  padding: "14px 32px",
                  display: "inline-block",
                }}
              >
                {c.cta}
              </Button>
            </Section>

            <Text style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.6, margin: "0 0 24px" }}>
              {c.expiry(expiresInHours)}
            </Text>

            <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 20px" }} />

            <Text style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.6, margin: "0 0 6px" }}>
              {c.fallback}
            </Text>
            <Link
              href={url}
              style={{
                color: ORANGE,
                fontSize: 12,
                wordBreak: "break-all" as const,
                lineHeight: 1.5,
              }}
            >
              {url}
            </Link>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: "0 0 10px 10px",
              border: "1px solid #e5e7eb",
              borderTop: "none",
              padding: "16px 32px",
              textAlign: "center" as const,
            }}
          >
            <Text style={{ color: TEXT_MUTED, fontSize: 12, margin: "0 0 8px", lineHeight: 1.6 }}>
              {c.ignore}
            </Text>
            <Text style={{ color: TEXT_MUTED, fontSize: 12, margin: "0 0 4px" }}>
              ASD Karibu Baskin Montecchio Maggiore · C.F. 04301440246
            </Text>
            <Text style={{ color: "#9ca3af", fontSize: 11, margin: 0 }}>{c.footer}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
