import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}

/** Підтвердження небезпечної дії у мові Aria. */
export const ConfirmSheet = ({
  open, onOpenChange, title, description, confirmLabel = "Видалити", onConfirm, confirmDisabled = false,
}: ConfirmSheetProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="w-[calc(100%-3rem)] max-w-md rounded-3xl">
      <AlertDialogHeader>
        <AlertDialogTitle className="font-display text-lg font-semibold">{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Скасувати</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={confirmDisabled}
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
