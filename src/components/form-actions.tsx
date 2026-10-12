import { Button, ButtonLink } from "./button";

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
      <ButtonLink href={cancelHref}>Batal</ButtonLink>
      <Button type="submit" pending={pending}>
        {label}
      </Button>
    </div>
  );
}
