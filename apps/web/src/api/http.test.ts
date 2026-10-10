import { createHttpClient } from "./http";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe("http client", () => {
  it("turns /chat into prose followed by source pills", async () => {
    const fetchMock = vi.fn(() =>
      json({
        conversation_id: 4,
        reply: "Sixty days.",
        sources: [
          { id: "s1", label: "Contract, part 1", document: "Contract", excerpt: "60 days" },
        ],
        elapsed_ms: 1200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const answer = await createHttpClient().ask("Notice period?", "4");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ message: "Notice period?", conversation_id: 4 }),
      }),
    );
    expect(answer.segments).toEqual([
      { type: "text", text: "Sixty days." },
      { type: "source", sourceId: "s1" },
    ]);
    expect(answer.conversationId).toBe("4");
    expect(answer.elapsedMs).toBe(1200);
  });

  it("builds collections from the document list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.endsWith("/documents")
          ? json([
              {
                id: 2,
                title: "B",
                collection: "Legal",
                kind: "pdf",
                chunks: 3,
                created_at: "2026-10-02T10:00:00Z",
              },
              {
                id: 1,
                title: "A",
                collection: "Legal",
                kind: "note",
                chunks: 1,
                created_at: "2026-10-01T10:00:00Z",
              },
            ])
          : json([{ id: 7, title: "first chat", created_at: "2026-10-01T10:00:00Z" }]),
      ),
    );
    const workspace = await createHttpClient().getWorkspace();
    expect(workspace.collections).toEqual([{ id: "Legal", name: "Legal", count: 2 }]);
    expect(workspace.documents[0]).toMatchObject({ id: "2", addedAt: "2026-10-02", chunks: 3 });
    expect(workspace.recent).toEqual([{ id: "7", title: "first chat" }]);
  });

  it("pairs saved messages into turns", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        json([
          { id: 1, role: "user", content: "Hi" },
          { id: 2, role: "assistant", content: "Hello" },
        ]),
      ),
    );
    const turns = await createHttpClient().getConversation("1");
    expect(turns).toHaveLength(1);
    expect(turns[0].question).toBe("Hi");
    expect(turns[0].answer.segments).toEqual([{ type: "text", text: "Hello" }]);
  });

  it("surfaces the API's detail and network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => json({ detail: "conversation not found" }, 404)),
    );
    await expect(createHttpClient().getConversation("9")).rejects.toThrow(
      "The API answered 404. conversation not found.",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("offline"))),
    );
    await expect(createHttpClient().getWorkspace()).rejects.toThrow("could not be reached");
  });
});
