import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HeadnoteClient } from "./api/types";
import App from "./App";
import { createMockClient } from "./test/mockClient";
import { mockAnswer, mockQuestion, mockWorkspace } from "./test/mockData";

const state = vi.hoisted(() => ({ current: null as unknown as HeadnoteClient }));

vi.mock("./api", () => ({
  client: new Proxy({}, { get: (_target, key) => state.current[key as keyof HeadnoteClient] }),
}));

function use(overrides: Partial<HeadnoteClient> = {}) {
  state.current = createMockClient(overrides);
}

beforeEach(() => {
  window.location.hash = "";
  use();
});

describe("chat", () => {
  it("starts empty, with no canned answer", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Ask about your documents" })).toBeVisible();
    expect(screen.queryByText(/leave the vendor contract early/)).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Vendor contracts/ })).toBeInTheDocument();
  });

  it("points at the library when it holds no documents", async () => {
    use({ getWorkspace: async () => ({ collections: [], documents: [], recent: [] }) });
    render(<App />);
    expect(await screen.findByText(/Your library is empty/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Add documents" })).toHaveAttribute(
      "href",
      "#/library",
    );
  });

  it("shows the answer with its sources and refreshes the sidebar", async () => {
    const getWorkspace = vi.fn(async () => structuredClone(mockWorkspace));
    use({ getWorkspace });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("log");
    await user.type(screen.getByLabelText("Question"), mockQuestion);
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByRole("heading", { name: mockQuestion })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Contract Q3, p.14/ })).toBeInTheDocument();
    expect(getWorkspace).toHaveBeenCalledTimes(2);
  });

  it("keeps the question and shows the error when the API fails", async () => {
    use({
      ask: async () => {
        throw new Error("The API could not be reached.");
      },
    });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("log");
    await user.type(screen.getByLabelText("Question"), "Will this fail?");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The API could not be reached.");
    expect(screen.getByLabelText("Question")).toHaveValue("Will this fail?");
  });

  it("opens a saved conversation from the sidebar route", async () => {
    window.location.hash = "#/chat/1";
    render(<App />);
    expect(await screen.findByRole("heading", { name: mockQuestion })).toBeInTheDocument();
  });

  it("offers a retry when a conversation fails to load", async () => {
    let calls = 0;
    use({
      getConversation: async () => {
        calls += 1;
        if (calls === 1) throw new Error("The API answered 404. conversation not found.");
        return [{ id: "t1", question: mockQuestion, answer: structuredClone(mockAnswer) }];
      },
    });
    window.location.hash = "#/chat/9";
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("conversation not found");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: mockQuestion })).toBeInTheDocument();
  });
});

describe("library", () => {
  it("filters the library by collection", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/library";
    render(<App />);
    await screen.findByRole("heading", { name: "Library" });
    await user.click(screen.getByRole("button", { name: "Board notes" }));
    expect(screen.getByRole("rowheader", { name: "Board notes 2025" })).toBeInTheDocument();
    expect(screen.queryByRole("rowheader", { name: "Vendor contract Q3" })).not.toBeInTheDocument();
  });

  it("shows the empty state with an invitation to add documents", async () => {
    use({ getWorkspace: async () => ({ collections: [], documents: [], recent: [] }) });
    window.location.hash = "#/library";
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Nothing saved yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add documents" })).toBeInTheDocument();
  });

  it("uploads files with the chosen collection and reloads the library", async () => {
    const addDocuments = vi.fn(async (documents: unknown[]) => ({ added: documents.length }));
    const getWorkspace = vi.fn(async () => structuredClone(mockWorkspace));
    use({ addDocuments, getWorkspace });
    window.location.hash = "#/library";
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Library" });
    await user.clear(screen.getByLabelText("Collection"));
    await user.type(screen.getByLabelText("Collection"), "Legal");
    const file = new File(["Terms apply."], "terms.md", { type: "text/markdown" });
    await user.upload(screen.getByLabelText("Choose text files"), file);
    expect(await screen.findByRole("status")).toHaveTextContent("Added 1 document.");
    expect(addDocuments).toHaveBeenCalledWith([
      { title: "terms", text: "Terms apply.", collection: "Legal", kind: "note" },
    ]);
    expect(getWorkspace).toHaveBeenCalledTimes(2);
  });

  it("reports a failed load and retries", async () => {
    let calls = 0;
    use({
      getWorkspace: async () => {
        calls += 1;
        if (calls === 1) throw new Error("down");
        return structuredClone(mockWorkspace);
      },
    });
    window.location.hash = "#/library";
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Library" })).toBeInTheDocument();
  });
});
