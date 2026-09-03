import type { ComponentProps } from "react"
import { FaFacebook, FaInstagram, FaSlack } from "react-icons/fa"

/** Lucide removed brand icons; thin wrappers keep className/size APIs familiar. */
type IconProps = ComponentProps<"svg"> & { size?: number | string }

export function Facebook({ className, size = 24, ...props }: IconProps) {
  return <FaFacebook className={className} size={size} {...props} />
}

export function Instagram({ className, size = 24, ...props }: IconProps) {
  return <FaInstagram className={className} size={size} {...props} />
}

export function Slack({ className, size = 24, ...props }: IconProps) {
  return <FaSlack className={className} size={size} {...props} />
}
