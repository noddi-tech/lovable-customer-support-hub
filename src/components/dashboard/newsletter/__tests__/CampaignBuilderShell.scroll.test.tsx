import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { CampaignBuilderShell } from "../CampaignBuilderShell";

// Mock responsive hooks
vi.mock('@/hooks/use-responsive', () => ({
  useIsMobile: () => false,
  useIsTablet: () => false
}));

test("campaigns has three independent scroll panes", () => {
  render(
    <div className="h-[900px]">
      <CampaignBuilderShell
        toolbar={<div>Toolbar</div>}
        left={<div>Left content</div>}
        center={<div>Center content</div>}
        right={<div>Right content</div>}
      />
    </div>
  );
  
  const grid = screen.getByTestId("campaigns-grid");
  expect(grid).toBeTruthy();
  
  // Check that grid has proper classes for height control
  expect(grid.className).toContain("h-full");
  expect(grid.className).toContain("min-h-0");
  expect(grid.className).toContain("grid");
  
  // Crude check: three direct children for desktop layout
  expect(grid.childElementCount).toBe(3);
});