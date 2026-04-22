import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Nexión",
  description: "Inicia sesión en Nexión",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
