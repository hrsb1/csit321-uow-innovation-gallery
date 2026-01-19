//Author: Jonty Hourn
//Description: This is the root layout for the Next.js application. It sets up the global styles, metadata, and includes the navigation bar and footer components.
import React from 'react';
import {Inter} from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import type { Metadata } from 'next';
import { Amplify } from 'aws-amplify';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import "./globals.css";
import config from '@/../amplify_outputs.json'
Amplify.configure(config, { ssr: true });

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: 'CSIT321 Project',
  description: 'Project for CSIT321',
  icons: {
    icon: '/icon.png',
  }
};

const RootLayout = ({ children }: React.PropsWithChildren) => (
  <html lang="en" className={inter.variable}>
    <body className='m-0 flex flex-col min-h-screen'>
      <header>
        <NavBar />
      </header>
      <main className='flex-grow font'>
        <AntdRegistry>{children}</AntdRegistry>
      </main>
      <footer className='mt-auto'>
        <Footer />
      </footer>
    </body>
  </html>
);

export default RootLayout;