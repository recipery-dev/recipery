import Image from "next/image";

import { cn } from "@/lib/utils";

import styles from "./animated-cook-logo.module.css";

export function AnimatedCookLogo({
  className,
  greeting = false,
}: {
  className?: string;
  greeting?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("block shrink-0", className)}
    >
      <span className={styles.logo} data-greeting={greeting}>
        <span className={cn(styles.layer, styles.body)}>
          <Image
            src="/logo/cook/cook-body.png"
            alt=""
            fill
            sizes="48px"
            draggable={false}
            priority
          />
        </span>

        <span className={cn(styles.layer, styles.bowl)}>
          <Image
            src="/logo/cook/cook-bowl-complete.png"
            alt=""
            fill
            sizes="48px"
            draggable={false}
            priority
          />
        </span>

        <span className={cn(styles.layer, styles.liquid)}>
          <Image
            src="/logo/cook/cook-liquid.png"
            alt=""
            fill
            sizes="48px"
            draggable={false}
            priority
          />
        </span>

        <span className={cn(styles.layer, styles.whisk)}>
          <Image
            src="/logo/cook/cook-stir-arm-whisk.png"
            alt=""
            fill
            sizes="48px"
            draggable={false}
            priority
          />
        </span>

        <span className={cn(styles.layer, styles.front)}>
          <Image
            src="/logo/cook/cook-bowl-front-overlay.png"
            alt=""
            fill
            sizes="48px"
            draggable={false}
            priority
          />
        </span>
      </span>
    </span>
  );
}
