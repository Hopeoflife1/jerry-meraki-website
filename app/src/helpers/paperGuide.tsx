// Plain-language paper and material guide. Shared by the quote form and the guide page.
export type PaperTier = "economy" | "standard" | "premium";

export type PaperEntry = {
  match: RegExp;
  name: string;
  feel: string;
  bestFor: string;
  watchOut: string;
  tier: PaperTier;
};

const ENTRIES: PaperEntry[] = [
  { match: /60gsm|80gsm|bond/i, name: "Bond (60 to 120gsm)", feel: "Office paper weight, writes easily", bestFor: "Letterheads, receipts, forms", watchOut: "Too thin for flyers you want people to keep", tier: "economy" },
  { match: /ncr|carbonless/i, name: "NCR carbonless", feel: "Thin, copies through to sheets below", bestFor: "Invoices, receipts, delivery notes", watchOut: "Not for full colour printing", tier: "economy" },
  { match: /115gsm/i, name: "115gsm gloss art", feel: "Light and flexible", bestFor: "Mass handout flyers on a budget", watchOut: "Creases easily and feels cheap in hand", tier: "economy" },
  { match: /150gsm|170gsm/i, name: "150 to 170gsm gloss/matte art", feel: "Noticeably firmer, premium feel", bestFor: "Flyers, brochure pages, posters", watchOut: "Costs a little more but brings far fewer complaints", tier: "standard" },
  { match: /250gsm|300gsm/i, name: "250 to 300gsm art card", feel: "Stiff card", bestFor: "Business cards, covers, hang tags, postcards", watchOut: "Fine for most cards; 350gsm feels more luxurious", tier: "standard" },
  { match: /350gsm|400gsm/i, name: "350 to 400gsm premium card", feel: "Thick and luxurious", bestFor: "Premium business cards, invitations, packaging", watchOut: "Needs lamination to stop edge cracking on folds", tier: "premium" },
  { match: /duplex/i, name: "Duplex board", feel: "Board with a grey back", bestFor: "Cost-effective product and food boxes", watchOut: "Grey inside is visible when the box is open", tier: "standard" },
  { match: /flute|corrugated/i, name: "Corrugated E-flute", feel: "Rigid, protective", bestFor: "Shipping and heavier products", watchOut: "Fine detail prints less sharply", tier: "premium" },
  { match: /vinyl|sav/i, name: "Vinyl sticker (SAV)", feel: "Plastic, flexible", bestFor: "Waterproof labels, bottles, outdoors", watchOut: "Costs more than paper stickers", tier: "premium" },
  { match: /paper sticker|sticker paper/i, name: "Paper sticker", feel: "Standard label paper", bestFor: "Dry products, envelopes, short term use", watchOut: "Smudges and peels if wet or oily", tier: "economy" },
  { match: /transparent|clear/i, name: "Transparent sticker", feel: "Clear film", bestFor: "No-label look on glass and clear jars", watchOut: "White ink may be needed for light colours", tier: "premium" },
  { match: /flex/i, name: "Flex banner", feel: "Heavy outdoor PVC", bestFor: "Outdoor banners and signage", watchOut: "Colours less rich than satin indoors", tier: "standard" },
  { match: /satin|backlit/i, name: "Satin / backlit film", feel: "Smooth, vivid", bestFor: "Indoor displays, lightboxes", watchOut: "Not for harsh outdoor weather", tier: "premium" },
  { match: /conqueror/i, name: "Conqueror", feel: "Textured premium paper", bestFor: "Executive letterheads, certificates", watchOut: "Premium price", tier: "premium" },
];

const TIER_LABEL: Record<PaperTier, string> = { economy: "Economy", standard: "Standard", premium: "Premium" };

const find = (stock: string) => ENTRIES.find((x) => x.match.test(stock)) ?? null;

const tipFor = (stock: string): string | null => {
  const e = find(stock);
  return e ? `${e.feel}. Best for ${e.bestFor.toLowerCase()}. ${e.watchOut}.` : null;
};

export const paperGuide = { ENTRIES, TIER_LABEL, find, tipFor };