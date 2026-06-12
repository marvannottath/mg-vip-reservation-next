import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "VIP Concierge | Le Marble Gallery",
  description: "Luxury showroom private reservation scheduler for Le Marble Gallery.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${cormorantGaramond.variable} ${inter.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
