import Image from "next/image";

type LogoProps = {
  surface?: "light" | "dark";
  className?: string;
};

export default function Logo({ surface = "light", className = "" }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Nexum Logo"
      width={48}
      height={48}
      className={`h-10 w-10 object-contain transition-all duration-300 ${
        surface === "dark" ? "brightness-200 invert" : "mix-blend-multiply"
      } ${className}`}
      priority
    />
  );
}

export function NexumIcon({ surface = "light", className = "w-3.5 h-3.5" }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Nexum"
      className={`inline-block object-contain shrink-0 ${
        surface === "dark" ? "brightness-200 invert" : "mix-blend-multiply"
      } ${className}`}
    />
  );
}
