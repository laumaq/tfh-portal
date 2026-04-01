// app/portail-externe-ferme/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo from '@/app/components/Logotypebaseline_NB.png';

export default function PortailExterneFerme() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            <Image
              src={logo}
              alt="Logo de l'école"
              className="h-auto max-w-[400px] object-contain"
              priority
            />
          </div>
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Portail lecteur externe fermé
          </h1>
        </div>

        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
            <p className="text-orange-800 mb-4">
              Le portail pour les inscriptions et connexions des lecteurs externes est temporairement fermé.
            </p>
            <p className="text-gray-600 text-sm">
              Veuillez contacter Frédéric Donjean pour plus d'informations.
            </p>
          </div>

          <div className="text-center text-xs text-gray-500 mt-4">
            <p>Contact : <a href="mailto:contact@ecole.be" className="text-blue-600 hover:underline">frederic.donjean@ens.ecl.be</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
