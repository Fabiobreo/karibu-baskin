"use client";
import { forwardRef, type AnchorHTMLAttributes } from "react";
import NextLink, { type LinkProps } from "next/link";
import { isPlainAnchorHref } from "@/lib/linkTarget";

type LinkBehaviorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  Partial<Pick<LinkProps, "prefetch" | "replace" | "scroll">> & {
    href?: LinkProps["href"];
  };

/**
 * Link di default per i componenti MUI (vedi `theme.ts`): `<Button href="/x">`
 * diventa un `next/link` e naviga lato client, anche da un Server Component,
 * perche' gli passa solo stringhe. Per esterni, `/api/*` e download resta un
 * `<a>` semplice (regole in `@/lib/linkTarget`).
 */
const LinkBehavior = forwardRef<HTMLAnchorElement, LinkBehaviorProps>(function LinkBehavior(
  { href, prefetch, replace, scroll, ...rest },
  ref
) {
  if (href === undefined || (typeof href === "string" && isPlainAnchorHref(href, rest.download))) {
    return <a ref={ref} href={href} {...rest} />;
  }
  return (
    <NextLink
      ref={ref}
      href={href}
      prefetch={prefetch}
      replace={replace}
      scroll={scroll}
      {...rest}
    />
  );
});

export default LinkBehavior;
