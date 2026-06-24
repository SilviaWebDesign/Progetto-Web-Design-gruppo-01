/* ============================================================
   DATA — SUSTAINABILITY SECTION
   ============================================================
   Content for the Sostenibilità section.
   3 topics × 6 comments (3 positive + 3 negative).
   ============================================================ */

import type { Section } from '$lib/types';

export const sustainabilitySection: Section = {
  id: 'sustainability',
  title: 'Sostenibilità',
  description:
    'Le Olimpiadi sono accompagnate da scelte che riguardano ambiente e risorse. Questi interventi possono essere letti come attenzione al territorio oppure come iniziative dal valore limitato, misurabile solo nel tempo.',
  object3D: '3d-tree',
  glbPath: '/models/crane.glb', // TODO: replace with /models/tree.glb when available
  frostImage: '/images/frost-sustanability.png',
  topics: [
    {
      id: 'venue-reuse',
      title: 'Riuso delle sedi',
      description:
        'Milano-Cortina 2026 è stata progettata intorno a un uso esteso di sedi già esistenti o temporanee, al fine di non lasciare “cattedrali nel deserto”, come spesso accade. Secondo la comunicazione ufficiale, circa il 90% delle sedi di gara rientra in questa logica di riuso. Alcuni degli esempi sono lo stadio di San Siro, l’Unipol Forum, e Rho Fiera.',
        
      comments: [
        {
          id: 'venue-reuse-pos-1',
          sentiment: 'positive',
          body: 'Questa scelta favorisce una migliore gestione del territorio, senza stravolgere le aree urbane e montane coinvolte.'
        },
        {
          id: 'venue-reuse-pos-2',
          sentiment: 'positive',
          body: 'In questo modo si evitano investimenti eccessivi in nuove infrastrutture destinate a restare inutilizzate.'
        },
        {
          id: 'venue-reuse-pos-3',
          sentiment: 'positive',
          body: 'Usare sedi esistenti è una scelta molto più sensata che costruire tutto da zero, l’impatto ambientale è ridotto significativamente.'
        },
        {
          id: 'venue-reuse-neg-1',
          sentiment: 'negative',
          body: 'Le Olimpiadi potevano essere un’occasione per costruire nuovi impianti più moderni nelle sedi coinvolte, per restare al passo coi tempi.'
        },
        {
          id: 'venue-reuse-neg-2',
          sentiment: 'negative',
          body: 'La comunicazione riguardo al riuso delle strutture non è stata trasparente, era solo una strategia di marketing e green-washing.'
        },
        {
          id: 'venue-reuse-neg-3',
          sentiment: 'negative',
          body: 'Molti impianti esistenti rischiano di non essere davvero adeguati agli standard richiesti per le competizioni olimpiche.'
        }

      ]
    },
    {
      id: 'climate-impact',
      title: 'Impatto climatico',
      description:
        'Il report ufficiale di sostenibilità stima le emissioni complessive di circa 1.005.000 tonnellate di CO₂ equivalente per la realizzazione dell’evento, suddivise nel seguente modo: 30% per la pianificazione e realizzazione dei Giochi, 29% per la costruzione di infrastrutture permanenti, e 41% per le attività correlate.',
      comments: [
        {
          id: 'climate-impact-pos-1',
          sentiment: 'positive',
          body: 'Il fatto che parte delle emissioni sia legata a infrastrutture permanenti suggerisce investimenti utili anche dopo i Giochi.'
        },
        {
          id: 'climate-impact-pos-2',
          sentiment: 'positive',
          body: 'È ammirevole che vengano rilasciate pubblicamente queste informazioni: Olimpiadi trasparenti e sostenibili!'
        },
        {
          id: 'climate-impact-pos-3',
          sentiment: 'positive',
          body: 'Suddividere le emissioni per fasi consente di individuare con precisione le aree su cui intervenire per ridurre l’impatto ambientale.'
        },
        {
          id: 'climate-impact-neg-1',
          sentiment: 'negative',
          body: 'Un milione di tonnellate di CO₂ sono ancora troppe per poter chiamare queste Olimpiadi “sostenibili”.'
        },
        {
          id: 'climate-impact-neg-2',
          sentiment: 'negative',
          body: 'Possono spacciarla come una conquista, ma bisogna vedere cosa viene considerato nel conteggio, conviene diffidare.'
        },
       {
          id: 'climate-impact-neg-3',
          sentiment: 'negative',
          body: 'Un report di sostenibilità non garantisce che le emissioni vengano realmente ridotte nelle fasi operative dell’evento.'
        }
      ]
    },
    {
      id: 'artificial-snow',
      title: 'Neve artificiale',
      description:
        'Le sedi alpine hanno fatto ricorso alla neve tecnica per garantire condizioni adatte alle competizioni. A Livigno sono stati prodotti oltre 600.000 metri cubi di neve da metà dicembre per freestyle e snowboard.',
      comments: [
        {
          id: 'artificial-snow-pos-1',
          sentiment: 'positive',
          body: 'Garantire piste adeguate può avere ricadute positive anche sul turismo invernale delle località coinvolte.'
        },
        {
          id: 'artificial-snow-pos-2',
          sentiment: 'positive',
          body: 'La scelta di investire nella neve artificiale dimostra la volontà di adattare gli eventi sportivi al cambiamento climatico.'
        },
        {
          id: 'artificial-snow-pos-3',
          sentiment: 'positive',
          body: 'La neve tecnica è l’unica soluzione concreta per mantenere vive le località alpine legate agli sport invernali.'
        },
        {
          id: 'artificial-snow-neg-1',
          sentiment: 'negative',
          body: 'Produrre una tale quantità di metri cubi di neve artificiale comporta un enorme consumo di acqua ed energia.'
        },
        {
          id: 'artificial-snow-neg-2',
          sentiment: 'negative',
          body: 'La necessità di produrre neve artificiale è indicatore di un’edizione dei Giochi poco sostenibile.'
        },
        {
          id: 'artificial-snow-neg-3',
          sentiment: 'negative',
          body: 'Affidarsi alla neve tecnica per le competizioni renderà sempre meno naturale l’esperienza degli sport invernali.'
        }
      ]
    }
  ]
};