import './globals.css';

export const metadata = {
  title: 'GATE CSE Tracker',
  description: 'Your personal GATE preparation operating system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
