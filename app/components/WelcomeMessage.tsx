// app/components/WelcomeMessage.tsx
'use client';

import { useEffect, useState } from 'react';

export default function WelcomeMessage() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const welcomeMsg = sessionStorage.getItem('welcomeMessage');
    if (welcomeMsg) {
      setMessage(welcomeMsg);
      setShow(true);
      sessionStorage.removeItem('welcomeMessage');
      
      // Masquer après 5 secondes
      setTimeout(() => setShow(false), 5000);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50 animate-fadeIn">
      <div className="flex items-center">
        <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <p>{message}</p>
      </div>
    </div>
  );
}
