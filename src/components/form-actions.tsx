import Link from "next/link";
import { Button } from "./button";

export function FormActions({
  cancelHref,
  pending,
  label = "Simpan",
}: {
  cancelHref: string;
  pending?: boolean;
  label?: string;
}) {
  return (
    <div className="form-actions">
      <Link className="button-link button-link--secondary" href={cancelHref}>
        Batal
      </Link>
      <Button type="submit" pending={pending}>
        {label}
      </Button>
    </div>
  );
}
