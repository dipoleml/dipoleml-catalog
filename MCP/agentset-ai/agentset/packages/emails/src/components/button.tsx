import type { ButtonProps } from "@react-email/components";
import { Button as BaseButton } from "@react-email/components";

export function Button(props: ButtonProps) {
  return (
    <BaseButton
      className="rounded-full bg-black px-6 py-2.5 text-center text-sm font-semibold text-white no-underline"
      {...props}
    />
  );
}
