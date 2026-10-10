import type { Answer, Workspace } from "../api/types";

export const mockWorkspace: Workspace = {
  collections: [
    { id: "contracts", name: "Vendor contracts", count: 14 },
    { id: "emails", name: "Renewal emails", count: 31 },
    { id: "board", name: "Board notes", count: 9 },
    { id: "pricing", name: "Pricing", count: 3 },
  ],
  documents: [
    {
      id: "d1",
      title: "Vendor contract Q3",
      collectionId: "contracts",
      kind: "pdf",
      addedAt: "2026-09-30",
      chunks: 86,
    },
    {
      id: "d2",
      title: "Renewal thread, R. Weiss",
      collectionId: "emails",
      kind: "email",
      addedAt: "2026-06-12",
      chunks: 12,
    },
    {
      id: "d3",
      title: "Board notes 2025",
      collectionId: "board",
      kind: "note",
      addedAt: "2026-05-04",
      chunks: 41,
    },
    {
      id: "d4",
      title: "Pricing sheet 2025",
      collectionId: "pricing",
      kind: "sheet",
      addedAt: "2026-02-18",
      chunks: 7,
    },
    {
      id: "d5",
      title: "Master services agreement",
      collectionId: "contracts",
      kind: "pdf",
      addedAt: "2026-01-22",
      chunks: 120,
    },
    {
      id: "d6",
      title: "Renewal notice draft",
      collectionId: "emails",
      kind: "email",
      addedAt: "2026-08-29",
      chunks: 4,
    },
  ],
  recent: ["termination clause", "Q3 pricing change"],
};

export const mockQuestion = "Can we leave the vendor contract early, and what does it cost?";

export const mockAnswer: Answer = {
  segments: [
    {
      type: "text",
      text: "Yes. Either side can end it for convenience with sixty days’ written notice ",
    },
    { type: "source", sourceId: "s1" },
    {
      type: "text",
      text: ". There is no exit fee in the contract, but the June renewal email commits the full year’s licence if notice arrives after 1 September ",
    },
    { type: "source", sourceId: "s2" },
    { type: "text", text: ", and today is after that date." },
  ],
  sources: [
    {
      id: "s1",
      label: "Contract Q3, p.14",
      document: "Vendor contract Q3",
      excerpt: "Either party may terminate for convenience upon sixty (60) days’ written notice.",
    },
    {
      id: "s2",
      label: "Email, 12 Jun",
      document: "Renewal thread, R. Weiss",
      excerpt: "After 1 September the annual licence is committed in full.",
    },
  ],
  conflicts: 1,
  elapsedMs: 600,
};
