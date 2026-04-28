'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart2 } from "lucide-react";
import { Footer } from "../components/Footer";

export function MentionsLegales() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <BarChart2 size={16} className="text-white" />
          </div>
          <h1 className="text-slate-900 font-bold text-base">VilleTracker</h1>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={15} />
          Retour
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 space-y-10">
        <h2 className="text-2xl font-bold text-slate-900">Mentions légales</h2>

        {/* Éditeur */}
        <section className="space-y-2">
          <h3 className="text-base font-semibold text-slate-800 border-b border-slate-200 pb-1">
            1. Éditeur du site
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Le site <strong>VilleTracker</strong> est édité par :
          </p>
          <ul className="text-sm text-slate-600 space-y-0.5 list-none">
            <li><span className="font-medium">Nom :</span> Noé FRAISSE</li>
            <li><span className="font-medium">Qualité :</span> Particulier</li>
            <li>
              <span className="font-medium">Contact :</span>{" "}
              <a href="mailto:contact@villetracker.fr" className="text-blue-600 hover:underline">
                contact@villetracker.fr
              </a>
            </li>
          </ul>
        </section>

        {/* Hébergeur */}
        <section className="space-y-2">
          <h3 className="text-base font-semibold text-slate-800 border-b border-slate-200 pb-1">
            2. Hébergeur
          </h3>
          <ul className="text-sm text-slate-600 space-y-0.5 list-none">
            <li><span className="font-medium">Société :</span> OVH SAS</li>
            <li><span className="font-medium">Forme juridique :</span> SAS au capital de 10 174 560 €</li>
            <li><span className="font-medium">Siège social :</span> 2 rue Kellermann, 59100 Roubaix, France</li>
            <li><span className="font-medium">RCS :</span> Lille Métropole 424 761 419 00045</li>
            <li>
              <span className="font-medium">Téléphone :</span>{" "}
              <a href="tel:+33972101007" className="text-blue-600 hover:underline">
                +33 9 72 10 10 07
              </a>
            </li>
            <li>
              <span className="font-medium">Site :</span>{" "}
              <a href="https://www.ovhcloud.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                www.ovhcloud.com
              </a>
            </li>
          </ul>
        </section>

        {/* Propriété intellectuelle */}
        <section className="space-y-2">
          <h3 className="text-base font-semibold text-slate-800 border-b border-slate-200 pb-1">
            3. Propriété intellectuelle
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Le code source du frontend de ce site est publié sous licence{" "}
            <strong>GNU Affero General Public License v3.0 (AGPL-3.0)</strong>. Toute réutilisation doit
            être publiée sous la même licence et créditer l'auteur original.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Les données affichées sont des données publiques issues de{" "}
            <a href="https://data.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">data.gouv.fr</a>,
            de l'INSEE, du Cerema, de la DINUM et du Ministère de l'Économie.
            Elles sont soumises aux licences de leurs producteurs respectifs (Etalab, Licence Ouverte 2.0).
          </p>
        </section>

        {/* Données personnelles & RGPD */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-slate-800 border-b border-slate-200 pb-1">
            4. Données personnelles et RGPD
          </h3>

          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">4.1 Statistiques de consultation (analytics)</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Le site collecte des statistiques agrégées sur les ressources consultées (communes, départements,
              types de données). Ces statistiques sont <strong>strictement anonymes</strong> : aucun identifiant
              personnel, aucun cookie de traçage, aucune donnée permettant d'identifier un visiteur n'est
              collectée ni conservée. Ce traitement ne constitue pas un traitement de données personnelles au
              sens du RGPD et ne requiert pas de base légale spécifique.
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">4.2 Adresses IP — système de protection contre les abus</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Afin d'assurer la sécurité et la disponibilité du service, les adresses IP peuvent être
              enregistrées temporairement en cas de comportement abusif (volume de requêtes anormal, tentatives
              d'intrusion, scraping massif). Une adresse IP est une donnée à caractère personnel au sens du RGPD.
            </p>
            <ul className="text-sm text-slate-600 space-y-1 mt-1 list-disc list-inside">
              <li>
                <span className="font-medium">Base légale :</span> intérêt légitime (art. 6.1.f RGPD) —
                protection du service contre les usages malveillants.
              </li>
              <li>
                <span className="font-medium">Durée de conservation :</span> 30 jours maximum à compter de
                la date de l'incident ou de la levée du blocage.
              </li>
              <li>
                <span className="font-medium">Destinataires :</span> données accessibles uniquement à
                l'éditeur du site. Non transmises à des tiers.
              </li>
              <li>
                <span className="font-medium">Droits :</span> vous disposez d'un droit d'accès, de
                rectification, d'effacement et d'opposition. Pour exercer ces droits, contactez{" "}
                <a href="mailto:contact@TODO.fr" className="text-blue-600 hover:underline">
                  contact@TODO.fr
                </a>.
              </li>
              <li>
                <span className="font-medium">Réclamation :</span> vous pouvez introduire une réclamation
                auprès de la{" "}
                <a
                  href="https://www.cnil.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  CNIL
                </a>.
              </li>
            </ul>
          </div>
        </section>

        {/* Limitation de responsabilité */}
        <section className="space-y-2">
          <h3 className="text-base font-semibold text-slate-800 border-b border-slate-200 pb-1">
            5. Limitation de responsabilité
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Les informations affichées sur ce site sont issues de sources publiques officielles et reproduites
            sans modification. L'éditeur ne garantit pas leur exhaustivité ni leur exactitude et décline toute
            responsabilité quant à leur utilisation. Le site est fourni en l'état, sans garantie de disponibilité
            permanente.
          </p>
        </section>

        <p className="text-xs text-slate-400 pt-4 border-t border-slate-200">
          Dernière mise à jour : avril 2025
        </p>
      </main>
      <Footer />
    </div>
  );
}
