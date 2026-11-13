import { permanentRedirect } from "next/navigation";

// Il simulatore è fra i giochi (UX-66). Le sfide già condivise (`?a=&b=&s=`)
// portano alla stessa sfida nel posto nuovo.
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function OldSfidaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["a", "b", "s"]) {
    const v = sp[key];
    const value = Array.isArray(v) ? v[0] : v;
    if (value) params.set(key, value);
  }
  const query = params.toString();
  permanentRedirect(query ? `/giochi/sfida?${query}` : "/giochi/sfida");
}
