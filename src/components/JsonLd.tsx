/**
 * Injecte un bloc JSON-LD dans le document.
 *
 * Composant serveur : le script doit être présent dans le HTML envoyé, les
 * crawlers qui lisent les données structurées n'exécutent pas forcément le JS.
 *
 * `JSON.stringify` suffit à l'échappement des valeurs ; on neutralise en plus
 * la séquence `</` qui fermerait prématurément la balise script si un nom de
 * commune contenait du balisage.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
