import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

beforeEach(() => {
  window.location.hash = "";
});

describe("App", () => {
  it("renders the chat template with the seeded answer", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: /leave the vendor contract early/ }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Vendor contracts/ })).toBeInTheDocument();
  });

  it("appends an answer from the client when a question is asked", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("log");
    await user.type(screen.getByLabelText("Question"), "What renews in June?");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(
      await screen.findByRole("heading", { name: "What renews in June?" }),
    ).toBeInTheDocument();
  });

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
    window.location.hash = "#/empty";
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Nothing saved yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add documents" })).toBeInTheDocument();
  });
});
