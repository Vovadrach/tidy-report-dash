import { Sheet } from "./Sheet";
import { Button } from "./Button";

interface ConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

/** Підтвердження небезпечної дії — нижній лист «Ясно». */
export const ConfirmSheet = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Видалити",
  onConfirm,
}: ConfirmSheetProps) => (
  <Sheet
    open={open}
    onOpenChange={onOpenChange}
    title={title}
    description={description}
    footer={
      <div className="flex gap-2">
        <Button variant="ghost" block onClick={() => onOpenChange(false)}>
          Скасувати
        </Button>
        <Button
          variant="danger"
          block
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    }
  >
    <p className="text-ink-2">{description}</p>
  </Sheet>
);
