import { serializeJsonLd } from "@/lib/structuredData";

/** Blocco JSON-LD. I dati passano da `serializeJsonLd`, che neutralizza `</script>`. */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
