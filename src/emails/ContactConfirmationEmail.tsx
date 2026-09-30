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
} from "@react-email/components";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { BRAND, EMAIL, HERO_TEXT } from "@/lib/palette";

interface Props {
  senderName: string;
  message: string;
  locale?: string;
}

const COPY = {
  it: {
    preview: "Abbiamo ricevuto il tuo messaggio. Ti risponderemo presto!",
    greeting: (name: string) => `Ciao ${name}! 👋`,
    received: "Abbiamo ricevuto il tuo messaggio e ti risponderemo il prima possibile.",
    direct:
      "Nel frattempo, se hai bisogno di contattarci direttamente puoi scriverci a asdkaribubaskin@gmail.com oppure chiamare Elisa al 349 297 2703.",
    msgLabel: "Il tuo messaggio",
    footer: "Hai ricevuto questa email perché hai compilato il form su karibubaskin.it",
  },
  en: {
    preview: "We received your message. We'll get back to you soon!",
    greeting: (name: string) => `Hi ${name}! 👋`,
    received: "We have received your message and will get back to you as soon as possible.",
    direct:
      "In the meantime, you can reach us directly at asdkaribubaskin@gmail.com or call Elisa at 349 297 2703.",
    msgLabel: "Your message",
    footer: "You received this email because you filled in the contact form on karibubaskin.it",
  },
};

export default function ContactConfirmationEmail({ senderName, message, locale = "it" }: Props) {
  const c = locale === "en" ? COPY.en : COPY.it;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{c.preview}</Preview>
      <Body
        style={{
          backgroundColor: EMAIL.background,
          fontFamily: "Inter, Arial, sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Container style={{ maxWidth: 560, margin: "40px auto", padding: "0 16px" }}>
          {/* Header */}
          <Section
            style={{
              backgroundColor: EMAIL.header,
              borderRadius: "10px 10px 0 0",
              padding: "24px 32px",
              textAlign: "center" as const,
            }}
          >
            <Text
              style={{
                color: BRAND.orangeOnDark,
                fontWeight: FONT_WEIGHT.bold,
                fontSize: 20,
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              Karibu Baskin
            </Text>
            <Text
              style={{
                color: HERO_TEXT.muted,
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
              backgroundColor: EMAIL.card,
              padding: "32px",
              borderLeft: `1px solid ${EMAIL.border}`,
              borderRight: `1px solid ${EMAIL.border}`,
            }}
          >
            <Heading
              as="h2"
              style={{
                color: EMAIL.text,
                fontSize: 20,
                fontWeight: FONT_WEIGHT.semibold,
                margin: "0 0 16px",
              }}
            >
              {c.greeting(senderName)}
            </Heading>
            <Text style={{ color: EMAIL.text, fontSize: 15, lineHeight: 1.7, margin: "0 0 8px" }}>
              {c.received}
            </Text>
            <Text
              style={{
                color: EMAIL.textSecondary,
                fontSize: 14,
                lineHeight: 1.6,
                margin: "0 0 24px",
              }}
            >
              {c.direct}
            </Text>

            <Hr style={{ borderColor: EMAIL.border, margin: "0 0 24px" }} />

            <Text
              style={{
                color: EMAIL.textSecondary,
                fontSize: 11,
                fontWeight: FONT_WEIGHT.semibold,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                margin: "0 0 8px",
              }}
            >
              {c.msgLabel}
            </Text>
            <Section
              style={{
                backgroundColor: EMAIL.background,
                borderRadius: 8,
                padding: "16px 20px",
                marginBottom: 0,
              }}
            >
              <Text
                style={{
                  color: EMAIL.text,
                  fontSize: 14,
                  lineHeight: 1.7,
                  margin: 0,
                  whiteSpace: "pre-wrap" as const,
                }}
              >
                {message}
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: EMAIL.background,
              borderRadius: "0 0 10px 10px",
              border: `1px solid ${EMAIL.border}`,
              borderTop: "none",
              padding: "16px 32px",
              textAlign: "center" as const,
            }}
          >
            <Text style={{ color: EMAIL.textSecondary, fontSize: 12, margin: "0 0 4px" }}>
              ASD Karibu Baskin Montecchio Maggiore · C.F. 04301440246
            </Text>
            <Text style={{ color: EMAIL.textSecondary, fontSize: 11, margin: 0 }}>{c.footer}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
