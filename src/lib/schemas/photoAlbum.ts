import { z } from "zod";
import { isoDateTime } from "./dateTime";

const VisibilitySchema = z.enum(["MEMBERS", "PUBLIC"]);
const LinkSchema = z.string().trim().min(1, "Incolla il link della cartella").max(500);
const TitleSchema = z.string().trim().min(1, "Titolo obbligatorio").max(120);
const RelationId = z.string().min(1).max(64).nullable().optional();

/** Un album sta con un evento o con una partita, non con tutti e due. */
const oneLink = (v: { eventId?: string | null; matchId?: string | null }) =>
  !(v.eventId && v.matchId);
const ONE_LINK_MESSAGE = "Collega l'album a un evento oppure a una partita, non a entrambi";

export const AlbumPreviewSchema = z.object({ link: LinkSchema });

export const AlbumCreateSchema = z
  .object({
    link: LinkSchema,
    title: TitleSchema,
    date: isoDateTime(),
    visibility: VisibilitySchema.default("MEMBERS"),
    eventId: RelationId,
    matchId: RelationId,
    // Dichiarazione dello staff: senza, l'album non si crea.
    permissionDeclared: z.literal(true, {
      message: "Serve il permesso di chi ha scattato le foto",
    }),
  })
  .refine(oneLink, { message: ONE_LINK_MESSAGE });

export const AlbumUpdateSchema = z
  .object({
    title: TitleSchema.optional(),
    date: isoDateTime().optional(),
    visibility: VisibilitySchema.optional(),
    coverPhotoId: z.string().min(1).max(64).nullable().optional(),
    eventId: RelationId,
    matchId: RelationId,
  })
  .refine(oneLink, { message: ONE_LINK_MESSAGE });

export const AlbumPhotoPatchSchema = z.object({ hidden: z.boolean() });

export type AlbumCreateInput = z.infer<typeof AlbumCreateSchema>;
export type AlbumUpdateInput = z.infer<typeof AlbumUpdateSchema>;
