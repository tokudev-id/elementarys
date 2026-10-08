import type { ReactNode } from "react";

export function MobileCardList<T extends { id: string }>({
  items,
  render,
}: {
  items: T[];
  render: (item: T) => ReactNode;
}) {
  return (
    <ul className="mobile-card-list">
      {items.map((item) => (
        <li key={item.id}>{render(item)}</li>
      ))}
    </ul>
  );
}
