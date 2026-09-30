import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
  Preview,
  Heading,
  Row,
  Column,
} from "@react-email/components";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { BRAND, EMAIL, HERO_TEXT } from "@/lib/palette";

interface Props {
  senderName: string;
  senderEmail: string;
  message: string;
}

export default function ContactNotificationEmail({ senderName, senderEmail, message }: Props) {
  return (
    <Html lang="it">
      <Head />
      <Preview>Nuovo messaggio da {senderName} tramite il sito</Preview>
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
                margin: "0 0 8px",
              }}
            >
              Nuovo messaggio dal sito
            </Heading>
            <Text style={{ color: EMAIL.textSecondary, fontSize: 14, margin: "0 0 24px" }}>
              Hai ricevuto un nuovo messaggio tramite il form di contatto.
            </Text>

            {/* Mittente */}
            <Section
              style={{
                backgroundColor: EMAIL.background,
                borderRadius: 8,
                padding: "16px 20px",
                marginBottom: 24,
              }}
            >
              <Row>
                <Column>
                  <Text
                    style={{
                      color: EMAIL.textSecondary,
                      fontSize: 11,
                      fontWeight: FONT_WEIGHT.semibold,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.08em",
                      margin: "0 0 2px",
                    }}
                  >
                    Nome
                  </Text>
                  <Text
                    style={{
                      color: EMAIL.text,
                      fontSize: 15,
                      fontWeight: FONT_WEIGHT.semibold,
                      margin: 0,
                    }}
                  >
                    {senderName}
                  </Text>
                </Column>
              </Row>
              <Hr style={{ borderColor: EMAIL.border, margin: "12px 0" }} />
              <Row>
                <Column>
                  <Text
                    style={{
                      color: EMAIL.textSecondary,
                      fontSize: 11,
                      fontWeight: FONT_WEIGHT.semibold,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.08em",
                      margin: "0 0 2px",
                    }}
                  >
                    Email
                  </Text>
                  <Link
                    href={`mailto:${senderEmail}`}
                    style={{
                      color: BRAND.orangeOnLight,
                      fontSize: 14,
                      fontWeight: FONT_WEIGHT.semibold,
                      textDecoration: "none",
                    }}
                  >
                    {senderEmail}
                  </Link>
                </Column>
              </Row>
            </Section>

            {/* Messaggio */}
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
              Messaggio
            </Text>
            <Section
              style={{ borderLeft: `3px solid ${EMAIL.border}`, paddingLeft: 16, marginBottom: 24 }}
            >
              <Text
                style={{
                  color: EMAIL.text,
                  fontSize: 15,
                  lineHeight: 1.7,
                  margin: 0,
                  whiteSpace: "pre-wrap" as const,
                }}
              >
                {message}
              </Text>
            </Section>

            <Hr style={{ borderColor: EMAIL.border, margin: "0 0 20px" }} />

            <Text style={{ color: EMAIL.textSecondary, fontSize: 13, margin: 0 }}>
              Rispondi direttamente a questa email per contattare {senderName}.
            </Text>
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
            <Text style={{ color: EMAIL.textSecondary, fontSize: 12, margin: 0 }}>
              ASD Karibu Baskin Montecchio Maggiore · C.F. 04301440246
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
