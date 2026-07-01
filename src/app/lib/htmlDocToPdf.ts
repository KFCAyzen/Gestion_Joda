// Convertit un document HTML imprimable complet (les mêmes chaînes que celles
// produites par les helpers print* RH) en un vrai fichier PDF téléchargé en
// un clic, via jsPDF.html() — le moteur déjà utilisé pour les quittances.
//
// Le rendu se fait dans une iframe hors-écran : la feuille de style du document
// (qui cible `body`, `header.doc`, etc.) reste totalement isolée de l'app.
// En cas d'échec, on retombe sur l'ouverture de la fenêtre d'impression pour
// que le bouton reste toujours utile.

import jsPDF from "jspdf";

export type PrintAction = "print" | "download";

/** Construit un nom de fichier PDF sûr à partir de fragments libres. */
export function pdfFilename(...parts: (string | undefined | null)[]): string {
  const base = parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "");
  return `${base || "document"}.pdf`;
}

function openPrintWindow(html: string): void {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function waitForImages(idoc: Document): Promise<void> {
  const pending = Array.from(idoc.images).filter((img) => !img.complete);
  if (pending.length === 0) return new Promise((r) => setTimeout(r, 120));
  return new Promise((resolve) => {
    let left = pending.length;
    const done = () => {
      left -= 1;
      if (left <= 0) setTimeout(resolve, 120);
    };
    pending.forEach((img) => {
      img.addEventListener("load", done);
      img.addEventListener("error", done);
    });
    // Filet de sécurité si une image ne se charge jamais.
    setTimeout(resolve, 1800);
  });
}

export async function downloadHtmlDocAsPdf(html: string, filename: string): Promise<void> {
  if (typeof window === "undefined") return;

  // Version sans le script d'auto-impression pour le rendu hors-écran.
  const cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, "");

  const RENDER_WIDTH_PX = 794; // ≈ 210 mm (A4) @ 96 dpi
  const A4_WIDTH_MM = 210;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;background:#ffffff;";
  document.body.appendChild(iframe);

  try {
    const idoc = iframe.contentDocument;
    if (!idoc) throw new Error("iframe document indisponible");
    idoc.open();
    idoc.write(cleaned);
    idoc.close();

    await waitForImages(idoc);
    // Laisse l'iframe s'étendre à la hauteur réelle du contenu pour ne rien tronquer.
    iframe.style.height = `${Math.max(idoc.body.scrollHeight, 1123)}px`;

    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    await doc.html(idoc.body, {
      x: 0,
      y: 0,
      width: A4_WIDTH_MM,
      windowWidth: RENDER_WIDTH_PX,
      autoPaging: "text",
      margin: 0,
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      },
    });
    doc.save(filename);
  } catch (err) {
    console.error("Génération PDF impossible, repli sur l'impression", err);
    openPrintWindow(html);
  } finally {
    iframe.remove();
  }
}
