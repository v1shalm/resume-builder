"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { dialogEnter } from "@/lib/motion";
import { useSfx } from "@/lib/useSfx";

type Ctx = { open: boolean };
const DialogContext = React.createContext<Ctx>({ open: false });

export function Dialog({
  open,
  onOpenChange,
  children,
  ...rest
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...rest}>
      <DialogContext.Provider value={{ open: Boolean(open) }}>
        {children}
      </DialogContext.Provider>
    </DialogPrimitive.Root>
  );
}

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { open } = React.useContext(DialogContext);
  const play = useSfx();
  return (
    <AnimatePresence>
      {open && (
        <DialogPortal forceMount>
          <DialogPrimitive.Overlay asChild forceMount>
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{
                opacity: 1,
                backdropFilter: "blur(4px)",
                transition: { duration: 0.22 },
              }}
              exit={{
                opacity: 0,
                backdropFilter: "blur(0px)",
                transition: { duration: 0.18 },
              }}
              className="fixed inset-0 z-50 bg-black/60"
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content
            ref={ref}
            forceMount
            asChild
            {...props}
          >
            <motion.div
              variants={dialogEnter}
              initial="hidden"
              animate="show"
              exit="exit"
              className={cn(
                "fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] overflow-hidden rounded-2xl border border-ink-border bg-overlay",
                "shadow-[inset_0_1px_0_var(--shadow-highlight),0_24px_64px_-16px_var(--shadow-drop-far),0_10px_24px_-8px_var(--shadow-drop-mid)]",
                className,
              )}
            >
              {children}
              <DialogPrimitive.Close
                onClick={() => play("modalClose")}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-ink-subtle transition-colors duration-fast hover:bg-ink-hover hover:text-ink-text"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPortal>
      )}
    </AnimatePresence>
  );
});
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1 px-5 pb-3 pt-5", className)} {...props} />
);

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-[14px] font-medium text-ink-text", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[12.5px] leading-[1.5] text-ink-muted", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";
