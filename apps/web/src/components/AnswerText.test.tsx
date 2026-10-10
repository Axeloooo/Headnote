import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockAnswer } from "../data/mock";
import { AnswerText } from "./AnswerText";

describe("AnswerText", () => {
  it("places source pills inside the sentence", () => {
    render(<AnswerText answer={mockAnswer} />);
    const pill = screen.getByRole("button", { name: "Contract Q3, p.14" });
    expect(pill.parentElement).toHaveTextContent(/sixty days’ written notice/);
    expect(screen.getByRole("button", { name: "Email, 12 Jun" })).toBeInTheDocument();
  });

  it("shows the excerpt when a pill is opened and hides it when closed", async () => {
    const user = userEvent.setup();
    render(<AnswerText answer={mockAnswer} />);
    const pill = screen.getByRole("button", { name: "Contract Q3, p.14" });
    await user.click(pill);
    expect(pill).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Vendor contract Q3")).toBeInTheDocument();
    await user.click(pill);
    expect(screen.queryByText("Vendor contract Q3")).not.toBeInTheDocument();
  });

  it("counts sources and conflicts in the footer", () => {
    render(<AnswerText answer={mockAnswer} />);
    expect(screen.getByText("2 sources")).toBeInTheDocument();
    expect(screen.getByText("1 conflict")).toBeInTheDocument();
  });
});
