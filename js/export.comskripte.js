/**
 * export.comskripte.js
 * ---------------------------------------------------------------------------
 * DIE SKRIPTE DER COM-BRUECKE MIT DER MODELLDATEI AUSLIEFERN (29. September).
 *
 * Weisung: «beim exportieren der axis modells, fragen ob man die
 * scriptdatein, die man für den aufbau neötigt (com schnittstelle) mit
 * generieren will im ausgewähltem ordner wie die json datei.»
 *
 * Die Bruecke (com/AxisVM_aufbauen.cmd + .ps1) nimmt beim Doppelklick die
 * JUENGSTE Modelldatei in ihrem eigenen Ordner. Liegen Skripte und Datei
 * zusammen, ist das Aufbauen ein Doppelklick - ohne Kopieren und ohne das
 * Projekt zu kennen, aus dem die Skripte stammen.
 *
 * WOHER DIE SKRIPTE KOMMEN
 * Modulversion (serve.py, GitHub Pages): aus com/ neben der Anwendung.
 * Gebuendelte Datei (file://): eingebettet von build_html.py, id
 * «com-skripte», ein Objekt {Dateiname: Text}. Der HTML-Parser macht aus
 * CR LF ein LF - deshalb werden die Zeilenenden beim Schreiben wieder auf
 * CR LF gestellt: cmd.exe findet Sprungmarken in Dateien mit blossem LF
 * nicht zuverlaessig, und die .ps1 ist so abgelegt.
 *
 * WOHIN
 * Kann der Browser einen Ordner waehlen lassen (showDirectoryPicker, Chrome
 * und Edge), fragt er nach dem Ordner und alles landet dort. Sonst werden
 * die Dateien einzeln heruntergeladen - in denselben Download-Ordner wie
 * die Modelldatei, also ebenfalls nebeneinander.
 * ---------------------------------------------------------------------------
 */

export const COM_SKRIPTE = ['AxisVM_aufbauen.cmd', 'AxisVM_aufbauen.ps1',
                            'AxisVM_auslesen.cmd', 'AxisVM_pruefen.cmd'];

const WAHL_KEY = 'tragjoch-com-skripte';

/** Die zuletzt getroffene Wahl im Dialog - eine Bequemlichkeit, kein Zustand. */
export function skripteGewaehlt() {
  try { return localStorage.getItem(WAHL_KEY) === 'ja'; } catch { return false; }
}
export function skripteMerken(ja) {
  try { localStorage.setItem(WAHL_KEY, ja ? 'ja' : 'nein'); } catch { /* egal */ }
}

/** CR LF, wie die Dateien in com/ liegen. */
export const mitCrlf = (t) => String(t).replace(/\r?\n/g, '\r\n');

/** Die vier Skripte als [{name, text}] - eingebettet oder aus com/. */
export async function comSkripte() {
  const eingebettet = typeof document !== 'undefined'
    ? document.getElementById('com-skripte')?.textContent?.trim() : '';
  if (eingebettet) {
    const d = JSON.parse(eingebettet);
    const fehlt = COM_SKRIPTE.filter((n) => typeof d[n] !== 'string');
    if (fehlt.length) throw new Error(`In dieser Datei fehlen Skripte: ${fehlt.join(', ')}`);
    return COM_SKRIPTE.map((name) => ({ name, text: mitCrlf(d[name]) }));
  }
  return Promise.all(COM_SKRIPTE.map(async (name) => {
    const a = await fetch(`com/${name}`, { cache: 'no-cache' });
    if (!a.ok) throw new Error(`Skript com/${name} nicht ladbar (HTTP ${a.status}).`);
    return { name, text: mitCrlf(await a.text()) };
  }));
}

function herunterladen({ name, text, typ = 'application/octet-stream' }) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: typ }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

/**
 * Dateien zusammen ablegen: in einen gewaehlten Ordner, sonst als Downloads.
 *
 * `holeDateien` wird erst NACH der Ordnerwahl gerufen: der Browser zeigt den
 * Ordnerdialog nur, solange der Klick auf «Ausleiten» noch frisch ist - wer
 * vorher auf das Netz wartet, riskiert die Absage «keine Benutzeraktion».
 *
 * @param {() => Promise<{name:string, text:string, typ?:string}[]>} holeDateien
 * @returns {Promise<{ordner?:string, heruntergeladen?:number, abgebrochen?:boolean}>}
 */
/*
 * >>> NUR EIN ORDNERDIALOG ZUR ZEIT (2. Oktober). <<<
 * Gemeldet: «COM-Ausleitung nicht möglich: Failed to execute
 * 'showDirectoryPicker' on 'Window': File picker already active.» - der
 * Browser lässt keinen zweiten Wähler zu, solange einer offen ist (zweiter
 * Klick, Enter im Dialog, ein liegengebliebener Dialog). Ein zweiter Aufruf
 * wartet jetzt nicht, er meldet sich; und scheitert der Wähler aus einem
 * anderen Grund als «abgebrochen», wird heruntergeladen statt abgebrochen.
 */
let wahlOffen = false;

export async function zusammenAblegen(holeDateien) {
  if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
    if (wahlOffen) return { laeuft: true };
    let dir = null;
    let grund = null;
    wahlOffen = true;
    try {
      dir = await window.showDirectoryPicker({ id: 'axisvm-com', mode: 'readwrite' });
    } catch (e) {
      if (e?.name === 'AbortError') return { abgebrochen: true };
      grund = e?.message ?? String(e);
    } finally {
      wahlOffen = false;
    }
    if (dir) {
      const dateien = await holeDateien();
      for (const d of dateien) {
        const fh = await dir.getFileHandle(d.name, { create: true });
        const w = await fh.createWritable();
        await w.write(d.text);
        await w.close();
      }
      return { ordner: dir.name };
    }
    // Der Wähler ging nicht - dann eben als Downloads, mit Grund.
    const dateien = await holeDateien();
    for (const d of dateien) {
      herunterladen(d);
      await new Promise((r) => setTimeout(r, 250));
    }
    return { heruntergeladen: dateien.length, grund };
  }
  // Ohne Ordnerwahl: nacheinander, mit kurzer Pause - manche Browser
  // verwerfen sonst alle Downloads ausser dem ersten.
  const dateien = await holeDateien();
  for (const d of dateien) {
    herunterladen(d);
    await new Promise((r) => setTimeout(r, 250));
  }
  return { heruntergeladen: dateien.length };
}
