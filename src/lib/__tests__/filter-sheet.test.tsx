import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { FilterSheet, FilterSheetTriggerButton } from "@/components/coffee/filter-sheet";

function Fixture() {
  const [open, setOpen] = useState(false);
  return <FilterSheet open={open} onOpenChange={setOpen} title="Coffee filters" trigger={<FilterSheetTriggerButton label="Filters" />}>
    <p>Choose a brewing method</p>
  </FilterSheet>;
}

it("the actual filter trigger opens the dialog and Escape returns focus to it", async () => {
  render(<Fixture />);
  const trigger = screen.getByRole("button", { name: "Filters" });
  fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Coffee filters" });
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
});
