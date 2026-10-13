import type { JobStatus } from "./schema";

// Shared catalog of products, papers, finishing and statuses for Jerry Meraki.
export const printCatalog = {
  products: [
    { id: "Flyers", blurb: "A5/A4 handbills for events, promos and churches", icon: "FileText", fromPrice: 35000 },
    { id: "Business cards", blurb: "Matte, gloss or soft-touch cards that feel premium", icon: "IdCard", fromPrice: 25000 },
    { id: "Brochures", blurb: "Bi-fold and tri-fold brochures for your business", icon: "BookOpen", fromPrice: 60000 },
    { id: "Booklets & magazines", blurb: "Saddle-stitched or perfect-bound publications", icon: "Book", fromPrice: 150000 },
    { id: "Packaging & boxes", blurb: "Product boxes, food packs, die-cut cartons", icon: "Package", fromPrice: 180000 },
    { id: "Stickers & labels", blurb: "Product labels, logo stickers, die-cut shapes", icon: "Sticker", fromPrice: 30000 },
    { id: "Banners & large format", blurb: "Flex banners, roll-ups, backdrops", icon: "Flag", fromPrice: 20000 },
    { id: "Invoices & receipt books", blurb: "Carbonless, numbered and bound booklets", icon: "ReceiptText", fromPrice: 45000 },
    { id: "Calendars", blurb: "Wall and desk calendars for the new year", icon: "CalendarDays", fromPrice: 120000 },
    { id: "Other", blurb: "Tell us what you need and we will price it", icon: "Sparkles", fromPrice: 0 },
  ],
  sizes: ["A6", "A5", "A4", "A3", "DL (99 x 210mm)", "Business card (90 x 55mm)", "Custom size"],
  papers: [
    { id: "80gsm bond", note: "Thin, economical. Fine for handbills and receipt books, not for anything premium." },
    { id: "115gsm gloss art", note: "Light and shiny. Good budget flyer stock, can feel flimsy." },
    { id: "150gsm gloss/matte art", note: "Our recommended flyer and brochure stock. Feels solid in the hand." },
    { id: "250gsm art card", note: "Stiff card for covers, light boxes and postcards." },
    { id: "300gsm art card", note: "Premium business card and cover weight." },
    { id: "350gsm art card", note: "Thick and luxurious. Best for business cards and premium packaging." },
    { id: "Duplex board", note: "Grey-back board for food and product packaging." },
    { id: "Sticker paper (SAV)", note: "Self-adhesive vinyl or paper for labels." },
    { id: "Flex banner", note: "Outdoor large format material." },
  ],
  finishing: [
    "Matte lamination",
    "Gloss lamination",
    "Soft-touch lamination",
    "Spot UV",
    "Foil (gold/silver)",
    "Die-cutting",
    "Folding",
    "Saddle stitching",
    "Perfect binding",
    "Numbering",
    "Rounded corners",
  ],
  sides: ["Single sided", "Double sided"],
  colourModes: ["Full colour (CMYK)", "Black only", "Spot colour"],
  statuses: [
    { id: "quote_requested", label: "Quote requested", short: "Requested" },
    { id: "quoted", label: "Quote sent", short: "Quoted" },
    { id: "approved", label: "Approved", short: "Approved" },
    { id: "artwork_check", label: "Artwork check", short: "Artwork" },
    { id: "in_production", label: "In production", short: "Printing" },
    { id: "ready", label: "Ready for pickup/delivery", short: "Ready" },
    { id: "delivered", label: "Delivered", short: "Delivered" },
    { id: "cancelled", label: "Cancelled", short: "Cancelled" },
  ] as { id: JobStatus; label: string; short: string }[],
  artworkChecklist: [
    { id: "cmyk", label: "My artwork is in CMYK, not RGB", why: "RGB colours look bright on screens but print dull or shifted. This is the number one cause of reprints." },
    { id: "bleed", label: "I added 3mm bleed on every edge", why: "Without bleed you may get thin white lines after cutting." },
    { id: "safe", label: "Text is at least 5mm inside the cut line", why: "Text too close to the edge can be trimmed off." },
    { id: "spacing", label: "Line spacing and font sizes are readable (8pt and above)", why: "Tight lines and tiny text become hard to read once printed." },
    { id: "resolution", label: "Images are 300 DPI at the printed size", why: "Low resolution images print blurry or pixelated." },
  ],
  costStages: [
    "Plate making",
    "Paper / stock",
    "Printing (impressions)",
    "Lamination",
    "Finishing (cutting, folding, binding)",
    "Design / artwork correction",
    "Transport & logistics",
  ],
};

export const statusLabel = (status: JobStatus) =>
  printCatalog.statuses.find((s) => s.id === status)?.label ?? status;

// Business rule (owner, 2026-10-09): a quote request only reaches the admins once EVERY artwork checklist item is ticked.
export const allArtworkChecksTicked = (checks: Record<string, boolean> | null | undefined) =>
  printCatalog.artworkChecklist.every((c) => checks?.[c.id] === true);