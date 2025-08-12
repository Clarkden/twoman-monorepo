import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "2 Man",
  description: "Dating reimagined.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-itunes-app" content="app-id=6505080080" />
      </head>
      <body className="bg-[#770EFF] text-white relative h-screen overflow-y-scroll flex flex-col">
        <div className="absolute top-0 left-0 w-full h-full -z-10">
          <Image
            src="/images/hearts.png"
            alt="Hearts"
            className="w-full h-full object-cover"
            fill
            priority
            style={{
              backgroundSize: "100px 100px", // Reduced size of the hearts
            }}
          />
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              background:
                "linear-gradient(to bottom, rgba(119, 14, 255, 0) 0%, rgba(119, 14, 255, 1) 100%)",
            }}
          />
        </div>
        <nav className="h-16 w-full">
          <div className="max-w-[1024px] h-full mx-auto flex flex-row items-center justify-between p-5">
            <a href="/" className="font-bold text-2xl text-white">
              2 Man
            </a>
            <div className="flex flex-row gap-5">
              <Link
                href="/support"
                className="text-sm text-neutral-300 hover:text-neutral-200"
              >
                Support
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-neutral-300 hover:text-neutral-200"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-neutral-300 hover:text-neutral-200"
              >
                Terms
              </Link>
            </div>
          </div>
        </nav>
        <div className="max-w-[1024px] mx-auto p-5">{children}</div>
      </body>
    </html>
  );
}
