import { render, screen } from "@testing-library/react";
import { CampaignBuilderShell } from "../CampaignBuilderShell";

test("campaigns has proper pane scroll structure", () => {
  render(
    <div className="h-[900px]">
      <CampaignBuilderShell
        left={<div>Left Content</div>}
        center={<div>Center Content</div>}
        right={<div>Right Content</div>}
      />
    </div>
  );
  
  const grid = screen.getByTestId("campaigns-grid");
  expect(grid).toBeTruthy();
  expect(grid.childElementCount).toBe(3);
});

test("mobile campaigns shows center pane with proper structure", () => {
  // Mock mobile breakpoint
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 500,
  });
  
  render(
    <div className="h-[900px]">
      <CampaignBuilderShell
        left={<div>Left Content</div>}
        center={<div>Center Content</div>}
        right={<div>Right Content</div>}
      />
    </div>
  );
  
  // On mobile, center content should be in a scrollable container
  expect(screen.getByText("Center Content")).toBeInTheDocument();
});

test("tablet campaigns shows two-pane structure", () => {
  // Mock tablet breakpoint
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 800,
  });
  
  render(
    <div className="h-[900px]">
      <CampaignBuilderShell
        left={<div>Left Content</div>}
        center={<div>Center Content</div>}
        right={<div>Right Content</div>}
      />
    </div>
  );
  
  const grid = screen.getByTestId("campaigns-grid");
  expect(grid).toBeTruthy();
  expect(grid.childElementCount).toBe(2); // Center and right on tablet
});