import type { ReactNode } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";

export type PageHeaderSecondaryAction = {
  label: string;
  href: string;
  destructive?: boolean;
};

export function PageHeader({
  title,
  description,
  actions,
  primaryAction,
  secondaryActions,
  meta,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: PageHeaderSecondaryAction[];
  meta?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header__main">
        <div className="page-header__title-row">
          <h1>{title}</h1>
          {meta}
        </div>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {(actions || primaryAction || (secondaryActions && secondaryActions.length > 0)) && (
        <div className="page-header__actions">
          {actions}
          {primaryAction}
          {secondaryActions && secondaryActions.length > 0 && (
            <>
              <div className="page-header__secondary-desktop">
                {secondaryActions.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`button-link ${
                      item.destructive ? "button-link--destructive" : "button-link--secondary"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="page-header__secondary-mobile">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" aria-label="Aksi lainnya">
                      <MoreHorizontal aria-hidden="true" size={20} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {secondaryActions.map((item) => (
                      <DropdownMenuItem
                        key={item.label}
                        asChild
                        variant={item.destructive ? "destructive" : "default"}
                      >
                        <Link href={item.href}>{item.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
