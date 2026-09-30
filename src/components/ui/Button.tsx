"use client";

import {
  buttonClassName,
  type ButtonVariant,
} from "@/components/ui/buttonStyles";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  className,
  fullWidth = false,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, className, fullWidth)}
      {...props}
    />
  );
}
