import Link from "next/link";
import {
  buttonClassName,
  type ButtonVariant,
} from "@/components/ui/buttonStyles";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
  fullWidth?: boolean;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  fullWidth = false,
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClassName(variant, className, fullWidth)}>
      {children}
    </Link>
  );
}
