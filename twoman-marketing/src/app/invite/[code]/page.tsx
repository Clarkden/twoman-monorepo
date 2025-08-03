'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import Image from "next/image";

export default function InvitePage() {
  const params = useParams();
  const code = params.code as string;

  useEffect(() => {
    // Try to open the app first
    const tryOpenApp = () => {
      // For iOS
      const appScheme = `twoman://invite/${code}`;
      window.location.href = appScheme;
      
      // Fallback to App Store after a short delay if app doesn't open
      setTimeout(() => {
        window.location.href = 'https://apps.apple.com/us/app/2-man/id6505080080';
      }, 1000);
    };

    // Small delay to let page load
    setTimeout(tryOpenApp, 100);
  }, [code]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen py-20 gap-8 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-black mb-4">
          You've been invited to
          <span className="block text-6xl mt-2">2 Man!</span>
        </h1>
        
        <p className="text-xl text-gray-600 mb-2">
          Your friend shared their referral code:
        </p>
        
        <div className="bg-gray-100 rounded-lg p-4 mb-6">
          <code className="text-2xl font-bold text-red-500 tracking-wider">
            {code}
          </code>
        </div>
        
        <p className="text-lg text-gray-600 mb-8">
          Download 2 Man and use this code to get <strong>1 week of Pro free!</strong>
        </p>
        
        <a
          href="https://apps.apple.com/us/app/2-man/id6505080080"
          className="inline-block"
        >
          <Image
            src="/images/download-on-appstore.svg"
            width={200}
            height={60}
            alt="Download on App Store"
            className="hover:opacity-80 transition-opacity"
          />
        </a>
        
        <p className="text-sm text-gray-500 mt-6">
          If you already have the app, it should open automatically.
        </p>
      </div>
    </main>
  );
}