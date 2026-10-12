import type { ReactNode } from "react";
import Link from "next/link";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Button, ButtonLink } from "./button";
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
  icon: Icon,
  leading,
}: {
  icon?: LucideIcon;
  leading?: ReactNode;
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
        {leading && <span className="page-header__leading">{leading}</span>}
        {Icon && !leading && (
          <span className="page-header__icon" aria-hidden="true">
            <Icon strokeWidth={1.75} />
          </span>
        )}
        <div className="page-header__text">
          <div className="page-header__title-row">
            <h1>{title}</h1>
            {meta}
          </div>
          {description && <p className="page-header__description">{description}</p>}
        </div>
      </div>
      {(actions || primaryAction || (secondaryActions && secondaryActions.length > 0)) && (
        <div className="page-header__actions">
          {actions}
          {primaryAction}
          {secondaryActions && secondaryActions.length > 0 && (
            <>
              <div className="page-header__secondary-desktop">
                {secondaryActions.map((item) => (
                  <ButtonLink
                    key={item.label}
                    href={item.href}
                    className={item.destructive ? "button-link--danger" : undefined}
                  >
                    {item.label}
                  </ButtonLink>
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
