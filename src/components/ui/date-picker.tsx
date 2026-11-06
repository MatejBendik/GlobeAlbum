"use client";

import dynamic from "next/dynamic";
import { useRef, useState, type ComponentProps } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ChevronProps } from "react-day-picker";
import { Button } from "./button";

const Calendar = dynamic(
  () => import("react-day-picker").then((module) => module.DayPicker),
  {
    ssr: false,
    loading: () => (
      <p className="field-hint" role="status">
        Loading calendar…
      </p>
    ),
  },
);

function CalendarChevron({ orientation }: ChevronProps) {
  return orientation === "left" ? (
    <ChevronLeft size={16} />
  ) : orientation === "right" ? (
    <ChevronRight size={16} />
  ) : (
    <ChevronDown size={14} />
  );
}

// Keep visits as local calendar dates; UTC conversion can shift the chosen day.
function dateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export type DatePickerProps = Pick<
  ComponentProps<"button">,
  | "id"
  | "ref"
  | "disabled"
  | "onBlur"
  | "aria-labelledby"
  | "aria-describedby"
  | "aria-invalid"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function DatePicker({ value, onChange, ...props }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  function select(date: Date | undefined) {
    onChange(date ? dateValue(date) : "");
    setOpen(false);
  }
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          {...props}
          type="button"
          variant="secondary"
          className="date-picker-trigger"
          data-empty={!value}
        >
          <CalendarDays size={17} aria-hidden="true" />
          <span id={`${props.id}-value`}>
            {selected
              ? new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(selected)
              : "Choose a date"}
          </span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={content}
          className="date-picker-popover"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          aria-label="Choose visit date"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            // Transfer focus after Radix pauses the parent dialog's focus scope.
            // A deferred calendar also focuses its active day when it mounts.
            (
              content.current?.querySelector<HTMLButtonElement>(
                '.rdp-day_button[tabindex="0"]',
              ) ?? content.current
            )?.focus();
          }}
          onEscapeKeyDown={(event) => event.stopPropagation()}
        >
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={select}
            weekStartsOn={1}
            captionLayout="dropdown"
            navLayout="after"
            startMonth={
              new Date(Math.min(1900, selected?.getFullYear() ?? 1900), 0)
            }
            endMonth={
              new Date(
                Math.max(
                  new Date().getFullYear() + 10,
                  selected?.getFullYear() ?? 0,
                ),
                11,
              )
            }
            showOutsideDays
            fixedWeeks
            autoFocus
            components={{ Chevron: CalendarChevron }}
          />
          <div className="date-picker-footer">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!value}
              onClick={() => select(undefined)}
            >
              Clear date
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => select(new Date())}
            >
              Today
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
