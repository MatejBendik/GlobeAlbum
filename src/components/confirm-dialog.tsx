"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import { Button } from "./ui/button";
import type { ActionResult } from "@/lib/types";
export function ConfirmDialog({
  title,
  description,
  trigger,
  onConfirm,
  onDone,
}: {
  title: string;
  description: string;
  trigger: React.ReactNode;
  onConfirm: () => Promise<ActionResult>;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content confirm-content">
          <AlertDialog.Title className="dialog-title">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="dialog-description">
            {description}
          </AlertDialog.Description>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={pending}>
                Keep it
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const result = await onConfirm();
                setPending(false);
                if (result.error) setError(result.error);
                else {
                  setOpen(false);
                  onDone();
                }
              }}
            >
              {pending ? "Removing…" : "Delete permanently"}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
