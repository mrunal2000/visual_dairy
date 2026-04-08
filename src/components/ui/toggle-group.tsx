import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

import { cn } from "@/lib/utils";

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-start gap-2", className)}
    {...props}
  />
));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      // Match the original `ToolbarButton` styling in `EntryComposer`.
      "flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-sm bg-[#F1F1F1] text-[#6B6B6B] transition hover:bg-[#e6e6e6] disabled:pointer-events-none disabled:opacity-50",
      // Make embedded icons consistent without per-icon classes.
      "[&_svg]:h-[15px] [&_svg]:w-[15px] [&_svg]:text-[#6B6B6B]",
      // Radix state styles
      "data-[state=on]:bg-[#e6e6e6]",
      className,
    )}
    {...props}
  />
));
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };

