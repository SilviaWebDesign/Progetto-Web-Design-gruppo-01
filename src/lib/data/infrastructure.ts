/* ============================================================
   DATA — INFRASTRUCTURE SECTION
   ============================================================
   Content for the Infrastrutture section.
   3 topics × 6 comments (3 positive + 3 negative).
   ============================================================ */

import type { Section } from '$lib/types';

export const infrastructureSection: Section = {
  id: 'infrastructure',
  title: 'Infrastrutture',
  description:
    'Le Olimpiadi prendono forma attraverso cantieri, impianti e collegamenti tra territori. Queste opere possono essere lette come investimenti utili o come interventi costosi, il cui valore dipende da cosa resterà dopo l’evento.',
  object3D: '3d-crane',
  glbPath: '/models/crane.glb',
  frostImage: '/images/frost-infrastructure.png',
  topics: [
    {
      id: 'olympic-village',
      title: 'Villaggio Olimpico',
      description:
        "Il Villaggio Olimpico di Porta Romana è stato progettato per ospitare gli atleti durante i Giochi e diventare student housing dopo l’evento. Il progetto presenta tecnologie ed impianti finalizzati al risparmio energetico. Una volta adibito a studentato, la quota mensile si aggirerà intorno ai 1.000€ per posto letto.",
      comments: [
        {
          id: 'olympic-village-pos-1',
          sentiment: 'positive',
          body: 'Finalmente un progetto che ha a cuore il risparmio energetico, è ammirevole.'
        },
        {
          id: 'olympic-village-pos-2',
          sentiment: 'positive',
          body: 'Diventando student housing, il Villaggio può contribuire in modo utile alla città.'
        },
        {
          id: 'olympic-village-pos-3',
          sentiment: 'positive',
          body: 'Ha contribuito a creare una bella atmosfera tra gli atleti, e rafforzare la sportività, che è fondamentale.'
        },
        {
          id: 'olympic-village-neg-1',
          sentiment: 'negative',
          body: 'Il villaggio olimpico ha distrutto Porta Romana.'
        },
        {
          id: 'olympic-village-neg-2',
          sentiment: 'negative',
          body: 'La quota di affitto non è accessibile, sarà l’ennesimo studentato soltanto per ricchi.'
        },
        {
          id: 'olympic-village-neg-3',
          sentiment: 'negative',
          body: 'L’edificio non ha un aspetto gradevole, rovina il panorama urbano con la sua estetica da prefabbricato.'
        }
      ]
    },
    {
      id: 'santa-giulia-arena',
      title: 'Arena Santa Giulia',
      description:
        "L’Arena Santa Giulia è stata progettata per ospitare l’hockey olimpico e diventare poi un’arena polifunzionale per eventi, sport e spettacoli. La costruzione dell’arena rientra nel progetto di riqualificazione del quartiere Santa Giulia, o Montecity-Rogoredo, nella periferia sudest di Milano.",
      comments: [
        {
          id: 'santa-giulia-arena-pos-1',
          sentiment: 'positive',
          body: "L’arena è completamente accessibile alle persone con disabilità, un grande passo avanti per l’Italia, finalmente."
        },
        {
          id: 'santa-giulia-arena-pos-2',
          sentiment: 'positive',
          body: 'Design estremamente moderno, un ottimo passo verso la riqualificazione di Santa Giulia.'
        },
        {
          id: 'santa-giulia-arena-pos-3',
          sentiment: 'positive',
          body: 'Struttura molto adatta per i concerti, l’acustica è ottima!'
        },
        {
          id: 'santa-giulia-arena-neg-1',
          sentiment: 'negative',
          body: "È inammissibile che l’arena sia stata utilizzata prima del suo completamento."
        },
        {
          id: 'santa-giulia-arena-neg-2',
          sentiment: 'negative',
          body: "La peggior arena di sempre, durante i Giochi si sono verificati troppi malfunzionamenti."
        },
        {
          id: 'santa-giulia-arena-neg-3',
          sentiment: 'negative',
          body: 'Uno spreco di risorse, sicuramente l’arena resterà inutilizzata.'
        }
      ]
    },
    {
      id: 'sliding-centre',
      title: 'Sliding Centre',
      description:
        "L’Eugenio Monti Sliding Centre è un tracciato per bob, skeleton e slittino situato a Cortina d’Ampezzo. La pista è stata ricostruita per ospitare le gare dei tre sport alle Olimpiadi Invernali di Milano-Cortina, ed è considerata una delle strutture più emblematiche dei Giochi.",
      comments: [
        {
          id: 'sliding-centre-pos-1',
          sentiment: 'positive',
          body: "Le Olimpiadi Invernali sono state l’occasione perfetta per ristrutturare la pista, finalmente si potrà praticare di nuovo il bob a Cortina!"
        },
        {
          id: 'sliding-centre-pos-2',
          sentiment: 'positive',
          body: "Gli atleti che ci hanno gareggiato l’hanno definita come la migliore di sempre, e il loro parere è sicuramente il più valido di tutti."
        },
        {
          id: 'sliding-centre-pos-3',
          sentiment: 'positive',
          body: 'Non è da poco costruire una struttura così di qualità in breve tempo, l’Italia dovrebbe esserne orgogliosa.'
        },
        {
          id: 'sliding-centre-neg-1',
          sentiment: 'negative',
          body: "La pista è stata costruita su un terreno franabile, è assurdo che questo progetto sia stato anche solo approvato."
        },
        {
          id: 'sliding-centre-neg-2',
          sentiment: 'negative',
          body: "L’impatto ambientale dello Sliding Centre rende impossibile apprezzarlo, indipendentemente dalla sua utilità."
        },
        {
          id: 'sliding-centre-neg-3',
          sentiment: 'negative',
          body: 'Dubito che verrà utilizzata dopo il termine dei Giochi, mantenerla sarà solo un peso economico per lo Stato.'
        }
      ]
    }
  ]
};