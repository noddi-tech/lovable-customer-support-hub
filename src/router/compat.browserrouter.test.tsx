import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BrowserRouter, Link } from "./compat"

describe("BrowserRouter compat", () => {
  it("renders children at /", async () => {
    render(
      <BrowserRouter>
        <div data-testid="child">hello</div>
        <Link to="/home">Home</Link>
      </BrowserRouter>,
    )
    expect(await screen.findByTestId("child")).toHaveTextContent("hello")
    expect(await screen.findByRole("link", { name: "Home" })).toBeInTheDocument()
  })

  it("renders children at /settings", async () => {
    render(
      <BrowserRouter initialEntries={["/settings"]}>
        <div data-testid="child">settings</div>
      </BrowserRouter>,
    )
    expect(await screen.findByTestId("child")).toHaveTextContent("settings")
  })
})
