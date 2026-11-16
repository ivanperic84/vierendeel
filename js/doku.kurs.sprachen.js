/**
 * DAS HANDBUCH ZUM KURS AUF FRANZÖSISCH UND ITALIENISCH (16. November).
 *
 * Weisung: «nutze das alte statiktool excel und die regelwerk dokumente im
 * grundlagenordner für eine übersetzung ins französische und italienische
 * des tools.» Das Handbuch ist zusammenhängender Text - es geht nicht über
 * das Wörterbuch der Oberfläche (sprache.texte.js), sondern steht hier
 * Kapitel für Kapitel, mit denselben Kennungen wie KURS_HANDBUCH
 * (doku.handbuch.js). Wer dort ein Kapitel ändert, zieht es hier nach.
 *
 * Fachbegriffe Französisch nach der Texttabelle der alten Mastberechnung und
 * den zweisprachigen Regelwerk-Blättern (Einwirkungen); Italienisch die
 * gebräuchlichen Begriffe, zur Durchsicht durch eine Fachperson
 * italienischer Sprache. Bezeichnungen von Knöpfen stehen so, wie das
 * Wörterbuch sie in der Oberfläche zeigt.
 */
import { NUTZUNG_HTML_FR, NUTZUNG_HTML_IT } from './stufe.js';

export const KURS_FR = [
  { id: 'k-start', titel: '1 Premiers pas', html: `
    <p><b>À l'ouverture</b> s'affichent les conditions d'utilisation (chapitre 13).
      «Lu et accepté» permet de continuer.</p>
    <p><b>Dans la barre d'en-tête</b> figure la structure en cours (projet et
      nom). Un clic ouvre le <b>gestionnaire de projets</b> :</p>
    <ul>
      <li><b>Exemples d'exercice</b> - charger un profil transversal du cours ; le
        plan se trouve alors derrière le modèle (visible en vue longitudinale).
        L'exemple est enregistré comme entrée dans l'archive.</li>
      <li><b>Nouveau profil transversal</b> - commencer avec une structure vide.</li>
      <li><b>Enregistrer</b> - l'état est enregistré dans l'archive de ce
        navigateur ; «Exporter» l'écrit dans un fichier, «Importer» charge un fichier.</li>
    </ul>
    <p>La saisie se fait en <b>trois étapes</b> (onglets en haut à gauche, «Suivant»
      en bas) : 1 Structure, 2 Équipements, 3 Tracé, vent, neige. Le calcul se fait
      automatiquement après chaque saisie, le résultat s'affiche à droite.</p>
    <p>Annuler : <b>Ctrl+Z</b> (ou les flèches en haut à côté d'«Exporter»), rétablir : <b>Ctrl+Maj+Z</b>.</p>` },
  { id: 'k-tragwerk', titel: '2 Étape 1 : structure', html: `
    <ol>
      <li><b>Choisir le type</b> - cliquer sur les vignettes joug support, mât isolé,
        console haubanée, joug d'amarrage ou les glisser dans la 3D. La bande
        au-dessus montre la position de toutes les structures et de tous les mâts
        sur le profil transversal ; un clic sélectionne.</li>
      <li><b>Joug</b> - type et longueur (longueurs de l'assortiment), hauteur
        au-dessus du sol. «Liaison joug - mât» : <i>tel que construit</i>
        (articulé dans le plan du joug) ou <i>encastré</i> - pour comparer
        l'évolution du taux d'utilisation et de la déformation.</li>
      <li><b>Mâts</b> - profilé, longueur (par 0.5 m), orientation de l'âme,
        position. Dans la 3D, un mât se déplace par le fût et s'allonge par la tête.</li>
      <li><b>Haubanage</b> - hauban ou contrefiche au mât (glisser la vignette
        «Hauban» sur un mât ou sous «Haubanage du mât»).</li>
      <li><b>Console haubanée</b> - longueur, côté (gauche/droite) et l'ancrage
        longitudinal sur le porte-à-faux avec sa position.</li>
    </ol>` },
  { id: 'k-anbau', titel: '3 Étape 2 : équipements', html: `
    <h4>Placer</h4>
    <ol>
      <li>Sous «Ajouter un équipement», chercher un modèle (champ de recherche) et
        cliquer dessus - ou «Attribuer un élément» puis cliquer dans le modèle ;
        la sélection adaptée à cet endroit s'y affiche.</li>
      <li>Cliquer à l'endroit voulu dans la 3D : sur le joug la position x, au mât
        la hauteur. Les consoles existent <b>vers la droite</b> et <b>vers la
        gauche</b>.</li>
    </ol>
    <h4>La fiche</h4>
    <p>Un clic sur une ligne ouvre la fiche : nom, emplacement (joug ou mât),
      position ou hauteur, sur le joug la fixation (membrure inférieure,
      supérieure, les deux) avec le pas des pinces. En dessous, pour chaque
      module, le <b>point d'application</b> x, y, z (sur le joug depuis l'axe de
      gravité de la membrure, au mât depuis le raccordement).</p>
    <ul>
      <li>Une valeur marquée «milieu de la longueur totale» découle de la
        <b>longueur totale</b> au-dessus - la modifier là.</li>
      <li><b>x ⇄</b> place une console avec sa ligne de contact de l'autre côté
        (symétrie).</li>
      <li>La coche désactive un élément (non calculé), la corbeille le supprime,
        la double feuille le copie.</li>
    </ul>
    <h4>Glisser dans la 3D</h4>
    <ul>
      <li>Saisir l'<b>élément</b> : sur le joug le déplacer en long, au mât en hauteur.</li>
      <li>Un <b>point d'application</b> (sphère) se déplace sur son axe - une
        béquille verticalement, une console horizontalement ; ce qui est
        suspendu à la console suit.</li>
      <li>L'<b>extrémité</b> (cube) d'un élément avec longueur modifie la longueur totale.</li>
      <li>Glissé avec <b>Ctrl</b>, une copie est créée. Le clic droit ouvre les commandes.</li>
    </ul>` },
  { id: 'k-trasse', titel: '4 Étape 3 : tracé, vent, neige', html: `
    <ul>
      <li><b>Distance au mât suivant</b> (portée) et <b>rayon de courbe</b>
        (+ et − pour les deux sens de courbe ; 0 = alignement). Il en découle
        l'effort de déviation des conducteurs.</li>
      <li><b>Zone de vent</b>, ainsi que la <b>réduction du vent</b> × 0.74 pour
        les zones densément bâties.</li>
      <li><b>Neige</b> activée ou désactivée.</li>
    </ul>
    <p><b>Ce qui est calculé</b> liste les cas de charge par direction :
      perpendiculaire à la voie (vent de gauche ou de droite), parallèle à la voie
      (en avant ou en arrière), autres, et en dessous la <b>déformation</b>
      (vent seul × 0.70). Un clic affiche le cas dans la 3D et dans le résultat ;
      «Tous les cas» montre pour chaque élément le cas le plus défavorable.
      «Toutes les combinaisons avec coefficients» ouvre le tableau complet.</p>` },
  { id: 'k-ergebnis', titel: '5 Lire le résultat', html: `
    <p><b>Taux d'utilisation</b> = sollicitation divisée par résistance. 100 %
      signifie : exactement à la limite. Au-delà de 100 %, un élément est trop faible.</p>
    <p>Pour chaque groupe (poutre, mâts, haubans, fondations, déformation)
      figure l'élément le plus sollicité. Couleur : vert jusqu'à 90 %, jaune
      jusqu'à 100 %, rouge au-delà.</p>
    <p><b>Contraintes dans les profilés</b> : la plus grande contrainte de
      comparaison σ_v dans le profilé et la limite correspondante, en N/mm². Pour
      l'acier S235, la limite est f_yd = 235 / 1.05 = 224 N/mm².</p>
    <p>Si un cas de charge est sélectionné, la phrase, les barres et les
      contraintes s'appliquent à ce cas («Dans le cas …»). L'onglet
      <b>Appuis</b> montre les réactions aux fondations (caractéristiques).</p>` },
  { id: 'k-3d', titel: '6 La vue 3D', html: `
    <ul>
      <li><b>Vue</b> - isométrie, vue longitudinale (vue perpendiculairement à la
        voie), coupe, vue de dessus. Tourner avec le bouton de souris enfoncé,
        déplacer avec le bouton droit, zoomer avec la molette.</li>
      <li><b>Dessin</b> - insérer un profil transversal (image ou page PDF) et le
        caler sur la longueur du joug ou du mât.</li>
      <li><b>Charges</b> - afficher ou masquer chaque type (permanentes,
        déviation, vent perpendiculaire, vent parallèle, neige), inscrire les
        valeurs. Un clic droit sur un bouton n'affiche que cette charge.</li>
      <li><b>Résultats</b> - η (taux d'utilisation), σ_v (contrainte de
        comparaison), M, V, N, T (efforts intérieurs), w (déformation), Pos
        (éléments par position).</li>
    </ul>` },
  { id: 'k-mehr', titel: '7 Afficher plus, appuis et export', html: `
    <p><b>Afficher plus</b> (bouton en haut) affiche d'autres saisies et
      évaluations : numéro du mât, décalage du pied, fondation, terrain,
      porte-à-faux du joug, angle du hauban, ajout ou échange de modules dans un
      équipement, l'onglet Diagrammes, les diagrammes d'efforts («Ligne»), les
      calques du modèle et le choix du cas de charge en haut de la 3D.
      «Afficher moins» les masque à nouveau.</p>
    <p><b>Exporter</b> : la feuille des réactions (avec croquis et remarques) et
      l'impression ; avec «Afficher plus», en plus la feuille des efforts au
      raccordement du joug et le classeur Excel.</p>` },
  { id: 'k-modell', titel: '8 Comment le calcul est effectué', html: `
    <p>La structure est un <b>treillis spatial</b> : les quatre cornières du joug,
      les plats de liaison entre elles et les mâts sont des barres. Les mâts sont
      encastrés au pied ; le joug est raccordé aux mâts.</p>
    <p>Le calcul est linéaire élastique : les efforts intérieurs (effort normal,
      effort tranchant, flexion, torsion) découlent des charges sur la structure
      non déformée. Les équipements sont suspendus au joug ou au mât par des
      liaisons rigides ; leurs charges agissent là où ils sont suspendus.</p>` },
  { id: 'k-einwirkungen', titel: '9 Actions', html: `
    <ul>
      <li><b>Poids propre</b> - barres, équipements et conducteurs.</li>
      <li><b>Vent</b> - sur le joug, les mâts, les équipements et les conducteurs ;
        la zone de vent détermine la pression dynamique. Par cas de charge, il agit
        dans une direction : perpendiculaire à la voie (de gauche ou de droite) ou
        parallèle (en avant ou en arrière).</li>
      <li><b>Neige</b> - sur le joug et les conducteurs, si activée.</li>
      <li><b>Effort de déviation</b> - en courbe, chaque conducteur tire
        latéralement sur la structure : Z · c / R (traction du conducteur fois
        distance au mât suivant divisée par le rayon de courbe). En alignement,
        il est nul.</li>
    </ul>` },
  { id: 'k-kombinationen', titel: '10 Cas de charge et coefficients', html: `
    <p>Un cas de charge (une combinaison) superpose les actions avec des coefficients :</p>
    <p class="formel">E_d = γ_G · poids propre + γ_Q · action prépondérante + ψ₀ · action concomitante</p>
    <p>Valeurs par défaut (chemin de fer) : γ_G = 1.30, γ_Q = 1.30, ψ₀ = 0.65.
      «Vent perpendiculaire à la voie, de gauche» vaut donc 1.30 · poids propre +
      1.30 · vent + 0.65 · neige ; «Beaucoup de neige, avec vent» inverse vent et
      neige. Là où le poids propre soulage, il entre avec 1.0 dans la combinaison.</p>
    <p>Le tableau de toutes les combinaisons avec leurs coefficients s'ouvre avec
      le bouton «Toutes les combinaisons avec coefficients» à l'étape 3. La
      déformation utilise ses propres cas : vent seul, réduit de 0.70 (vent de
      service).</p>` },
  { id: 'k-nachweise', titel: '11 Justifications', html: `
    <ul>
      <li><b>Joug et mâts</b> - contrainte : σ_v = √(σ² + 3τ²) ≤ f_yd, pour
        chaque barre, dans le cas de charge le plus défavorable.</li>
      <li><b>Fondation</b> - les efforts au pied du mât avec tous les coefficients
        1.0 (caractéristiques) par rapport aux charges admissibles du type de
        fondation.</li>
      <li><b>Haubanage</b> - effort dans le câble ou la contrefiche par rapport à
        l'effort admissible du type.</li>
      <li><b>Déformation</b> - la position latérale du fil de contact
        perpendiculairement à la voie sous vent de service (vent × 0.70) au
        maximum 40 mm.</li>
    </ul>` },
  { id: 'k-grenzen', titel: '12 Limites de cette version', html: `
    <p>La version de formation est une <b>vérification préliminaire</b>, pas une
      justification statique vérifiée. Le flambage des mâts n'est pas activé par
      défaut ; modèle de calcul, coefficients, cas de charge et données des
      éléments sont fixes, l'avarie (rupture d'un conducteur) n'est pas calculée.
      La justification d'un projet est établie par un spécialiste dans la
      version complète.</p>` },
  { id: 'k-nutzung', titel: '13 Utilisation et diffusion', html: NUTZUNG_HTML_FR },
];

export const KURS_IT = [
  { id: 'k-start', titel: '1 Primi passi', html: `
    <p><b>All'apertura</b> compaiono le condizioni d'uso (capitolo 13). Con
      «Letto e accettato» si prosegue.</p>
    <p><b>Nella barra di intestazione</b> figura la struttura su cui si lavora
      (progetto e nome). Un clic apre il <b>gestore dei progetti</b>:</p>
    <ul>
      <li><b>Esempi di esercizio</b> - caricare un profilo trasversale del corso;
        il disegno si trova dietro al modello (visibile nella vista
        longitudinale). L'esempio viene salvato come voce nell'archivio.</li>
      <li><b>Nuovo profilo trasversale</b> - iniziare con una struttura vuota.</li>
      <li><b>Salvare</b> - lo stato viene salvato nell'archivio di questo
        browser; «Esporta» lo scrive in un file, «Importa» carica un file.</li>
    </ul>
    <p>L'inserimento avviene in <b>tre passi</b> (schede in alto a sinistra,
      «Avanti» in basso): 1 Struttura, 2 Equipaggiamenti, 3 Tracciato, vento,
      neve. Il calcolo avviene automaticamente dopo ogni inserimento, il
      risultato compare a destra.</p>
    <p>Annulla: <b>Ctrl+Z</b> (o le frecce in alto accanto a «Esporta»), ripristina: <b>Ctrl+Maiusc+Z</b>.</p>` },
  { id: 'k-tragwerk', titel: '2 Passo 1: struttura', html: `
    <ol>
      <li><b>Scegliere il tipo</b> - cliccare i riquadri portale di sospensione,
        palo singolo, mensola tirantata, portale di ancoraggio o trascinarli nel
        3D. La banda sopra mostra la posizione di tutte le strutture e di tutti i
        pali sul profilo trasversale; un clic seleziona.</li>
      <li><b>Portale</b> - tipo e lunghezza (lunghezze dell'assortimento),
        altezza dal suolo. «Collegamento portale - palo»: <i>come costruito</i>
        (incernierato nel piano del portale) o <i>incastrato</i> - per
        confrontare come cambiano grado di utilizzo e deformazione.</li>
      <li><b>Pali</b> - profilo, lunghezza (a passi di 0.5 m), orientamento
        dell'anima, posizione. Nel 3D un palo si sposta afferrando il fusto e si
        allunga dalla testa.</li>
      <li><b>Controventatura</b> - tirante o puntone al palo (trascinare il
        riquadro «Tirante» su un palo o sotto «Controventatura del palo»).</li>
      <li><b>Mensola tirantata</b> - lunghezza, lato (sinistra/destra) e
        l'ancoraggio longitudinale sullo sbalzo con la sua posizione.</li>
    </ol>` },
  { id: 'k-anbau', titel: '3 Passo 2: equipaggiamenti', html: `
    <h4>Posizionare</h4>
    <ol>
      <li>Sotto «Aggiungi equipaggiamento» cercare un modello (campo di ricerca)
        e cliccarlo - oppure «Assegna elemento» e poi cliccare nel modello; lì
        compare la scelta adatta a quel punto.</li>
      <li>Cliccare nel 3D nel punto voluto: sul portale la posizione x, al palo
        l'altezza. Le mensole esistono <b>verso destra</b> e <b>verso sinistra</b>.</li>
    </ol>
    <h4>La scheda</h4>
    <p>Un clic su una riga apre la scheda: nome, ubicazione (portale o palo),
      posizione o altezza, sul portale il fissaggio (corrente inferiore,
      superiore, entrambi) con il passo dei morsetti. Sotto, per ogni modulo, il
      <b>punto di applicazione</b> x, y, z (sul portale dall'asse baricentrico
      del corrente, al palo dal collegamento).</p>
    <ul>
      <li>Un valore indicato con «metà della lunghezza totale» deriva dalla
        <b>lunghezza totale</b> sopra - modificarlo lì.</li>
      <li><b>x ⇄</b> porta una mensola con la sua linea di contatto sull'altro
        lato (simmetria).</li>
      <li>La spunta disattiva un elemento (non calcolato), il cestino lo
        elimina, il doppio foglio lo copia.</li>
    </ul>
    <h4>Trascinare nel 3D</h4>
    <ul>
      <li>Afferrare l'<b>elemento</b>: sul portale spostarlo in lunghezza, al
        palo in altezza.</li>
      <li>Un <b>punto di applicazione</b> (sfera) si sposta sul suo asse - un
        pendino rigido verticalmente, una mensola orizzontalmente; ciò che è
        appeso alla mensola segue.</li>
      <li>L'<b>estremità</b> (cubo) di un elemento con lunghezza modifica la
        lunghezza totale.</li>
      <li>Trascinando con <b>Ctrl</b> si crea una copia. Il clic destro apre i comandi.</li>
    </ul>` },
  { id: 'k-trasse', titel: '4 Passo 3: tracciato, vento, neve', html: `
    <ul>
      <li><b>Distanza dal palo successivo</b> (campata) e <b>raggio di curva</b>
        (+ e − per i due sensi di curva; 0 = rettilineo). Ne deriva la forza
        di deviazione dei conduttori.</li>
      <li><b>Zona di vento</b>, inoltre la <b>riduzione del vento</b> × 0.74 per
        zone densamente edificate.</li>
      <li><b>Neve</b> attivata o disattivata.</li>
    </ul>
    <p><b>Cosa viene calcolato</b> elenca i casi di carico per direzione:
      trasversale al binario (vento da sinistra o da destra), longitudinale al
      binario (in avanti o all'indietro), altri, e sotto la
      <b>deformazione</b> (solo vento × 0.70). Un clic mostra il caso nel 3D e
      nel risultato; «Tutti i casi» mostra per ogni elemento il caso più
      sfavorevole. «Tutte le combinazioni con i coefficienti» apre la tabella
      completa.</p>` },
  { id: 'k-ergebnis', titel: '5 Leggere il risultato', html: `
    <p><b>Grado di utilizzo</b> = sollecitazione divisa per resistenza. 100 %
      significa: esattamente al limite. Oltre il 100 % un elemento è troppo debole.</p>
    <p>Per ogni gruppo (trave, pali, tiranti, fondazioni, deformazione) compare
      l'elemento più sollecitato. Colore: verde fino al 90 %, giallo fino al
      100 %, rosso oltre.</p>
    <p><b>Tensioni nei profili</b>: la massima tensione equivalente σ_v nel
      profilo e il limite corrispondente, in N/mm². Per l'acciaio S235 il limite
      è f_yd = 235 / 1.05 = 224 N/mm².</p>
    <p>Se è selezionato un caso di carico, frase, barre e tensioni valgono per
      quel caso («Nel caso …»). La scheda <b>Appoggi</b> mostra le reazioni
      alle fondazioni (caratteristiche).</p>` },
  { id: 'k-3d', titel: '6 La vista 3D', html: `
    <ul>
      <li><b>Vista</b> - isometria, vista longitudinale (vista trasversalmente
        al binario), sezione, vista dall'alto. Ruotare tenendo premuto il mouse,
        spostare con il tasto destro, zoomare con la rotella.</li>
      <li><b>Disegno</b> - inserire un profilo trasversale (immagine o pagina
        PDF) e calibrarlo sulla lunghezza del portale o del palo.</li>
      <li><b>Carichi</b> - mostrare o nascondere ogni tipo (permanenti,
        deviazione, vento trasversale, vento longitudinale, neve), scrivere i
        valori. Un clic destro su un pulsante mostra solo quel carico.</li>
      <li><b>Risultati</b> - η (grado di utilizzo), σ_v (tensione equivalente),
        M, V, N, T (sollecitazioni interne), w (deformazione), Pos (elementi per
        posizione).</li>
    </ul>` },
  { id: 'k-mehr', titel: '7 Mostra di più, appoggi ed esportazione', html: `
    <p><b>Mostra di più</b> (pulsante in alto) mostra ulteriori dati ed
      elaborazioni: numero del palo, spostamento del piede, fondazione, terreno,
      sbalzi del portale, angolo del tirante, aggiunta o sostituzione di moduli
      in un equipaggiamento, la scheda Andamenti, i diagrammi delle
      sollecitazioni («Linea»), i livelli del modello e la scelta del caso di
      carico in alto nel 3D. «Mostra di meno» li nasconde di nuovo.</p>
    <p><b>Esporta</b>: il foglio delle reazioni (con schizzo e note) e la
      stampa; con «Mostra di più» anche il foglio delle forze al collegamento
      del portale e la cartella Excel.</p>` },
  { id: 'k-modell', titel: '8 Come viene calcolato', html: `
    <p>La struttura è un <b>telaio spaziale</b>: i quattro angolari del
      portale, le piastre di collegamento tra di essi e i pali sono aste. I pali
      sono incastrati al piede; il portale è collegato ai pali.</p>
    <p>Il calcolo è lineare elastico: le sollecitazioni (sforzo normale,
      taglio, flessione, torsione) derivano dai carichi sulla struttura
      indeformata. Gli equipaggiamenti sono appesi al portale o al palo tramite
      collegamenti rigidi; i loro carichi agiscono dove sono appesi.</p>` },
  { id: 'k-einwirkungen', titel: '9 Azioni', html: `
    <ul>
      <li><b>Peso proprio</b> - aste, equipaggiamenti e conduttori.</li>
      <li><b>Vento</b> - su portale, pali, equipaggiamenti e conduttori; la zona
        di vento determina la pressione dinamica. Per ogni caso di carico agisce
        in una direzione: trasversale al binario (da sinistra o da destra) o
        longitudinale (in avanti o all'indietro).</li>
      <li><b>Neve</b> - su portale e conduttori, se attivata.</li>
      <li><b>Forza di deviazione</b> - in curva ogni conduttore tira
        lateralmente sulla struttura: Z · c / R (tiro del conduttore per distanza
        dal palo successivo diviso il raggio di curva). In rettilineo è nulla.</li>
    </ul>` },
  { id: 'k-kombinationen', titel: '10 Casi di carico e coefficienti', html: `
    <p>Un caso di carico (una combinazione) sovrappone le azioni con dei coefficienti:</p>
    <p class="formel">E_d = γ_G · peso proprio + γ_Q · azione principale + ψ₀ · azione concomitante</p>
    <p>Valori predefiniti (ferrovia): γ_G = 1.30, γ_Q = 1.30, ψ₀ = 0.65.
      «Vento trasversale al binario, da sinistra» vale quindi 1.30 · peso
      proprio + 1.30 · vento + 0.65 · neve; «Molta neve, con vento» scambia
      vento e neve. Dove il peso proprio scarica, entra con 1.0 nella
      combinazione.</p>
    <p>La tabella di tutte le combinazioni con i loro coefficienti si apre con
      il pulsante «Tutte le combinazioni con i coefficienti» nel passo 3. La
      deformazione usa casi propri: solo vento, ridotto con 0.70 (vento di
      servizio).</p>` },
  { id: 'k-nachweise', titel: '11 Verifiche', html: `
    <ul>
      <li><b>Portale e pali</b> - tensione: σ_v = √(σ² + 3τ²) ≤ f_yd, per ogni
        asta, nel caso di carico più sfavorevole.</li>
      <li><b>Fondazione</b> - le forze al piede del palo con tutti i
        coefficienti 1.0 (caratteristiche) rispetto ai carichi ammissibili del
        tipo di fondazione.</li>
      <li><b>Controventatura</b> - forza nella fune o nel puntone rispetto alla
        forza ammissibile del tipo.</li>
      <li><b>Deformazione</b> - la posizione laterale del filo di contatto
        trasversalmente al binario con vento di servizio (vento × 0.70) al
        massimo 40 mm.</li>
    </ul>` },
  { id: 'k-grenzen', titel: '12 Limiti di questa versione', html: `
    <p>La versione di formazione è una <b>verifica preliminare</b>, non una
      verifica statica controllata. L'instabilità dei pali non è attivata di
      default; modello di calcolo, coefficienti, casi di carico e dati degli
      elementi sono fissi, l'avaria (rottura di un conduttore) non viene
      calcolata. La verifica per un progetto è eseguita da uno specialista
      nella versione completa.</p>` },
  { id: 'k-nutzung', titel: '13 Uso e diffusione', html: NUTZUNG_HTML_IT },
];
