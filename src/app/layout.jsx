import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "مكتب أيسر",
  description: "هذا موقع خاص بمكتب السيد أيسر",
};

export default function RootLayout({ children }) {
 return (
    <html lang="ar" dir="rtl"> 
      <body  >
        <AppRouterCacheProvider> 
            {children} 
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
