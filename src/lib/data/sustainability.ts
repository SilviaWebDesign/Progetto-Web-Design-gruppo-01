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
    'Le Olimpiadi sono accompagnate da scelte\nche riguardano ambiente e risorse.\nQuesti interventi possono essere letti\ncome attenzione al territorio,\noppure come iniziative dal valore limitato,\nmisurabile solo nel tempo.',
  object3D: '3d-tree',
  glbPath: '/models/sustainability-base.glb',
  frostImage: '/images/frost-sustainability.png',
  modelFitFactor: 1.0,
  resultScale: 0.9,
  topics: [
    {
      id: 'venue-reuse',
      title: 'Riuso delle sedi',
      description:
        'Milano-Cortina 2026 è stata progettata intorno a un uso esteso di sedi già esistenti o temporanee, al fine di non lasciare “cattedrali nel deserto”, come spesso accade. Secondo la comunicazione ufficiale, circa il 90% delle sedi di gara rientra in questa logica di riuso. Alcuni degli esempi sono lo stadio di San Siro, l’Unipol Forum, e Rho Fiera.',
      sources: [
        { label: 'SIMICO', url: 'https://www.simico.it/piano-delle-opere/' }
      ],  
      comments: [
        {
          id: 'venue-reuse-pos-1',
          sentiment: 'positive',
          body: 'Questa scelta favorisce una migliore\ngestione del territorio, senza stravolgere\nle aree urbane e montane coinvolte.'
        },
        {
          id: 'venue-reuse-pos-2',
          sentiment: 'positive',
          body: 'In questo modo si evitano investimenti eccessivi in nuove infrastrutture destinate a restare inutilizzate.'
        },
        {
          id: 'venue-reuse-pos-3',
          sentiment: 'positive',
          body: 'Usare sedi esistenti è una scelta molto\npiù sensata che costruire tutto da zero,\nl’impatto ambientale è ridotto\nsignificativamente.'
        },
        {
          id: 'venue-reuse-neg-1',
          sentiment: 'negative',
          body: 'Le Olimpiadi potevano essere un’occasione\nper costruire nuovi impianti più moderni\nnelle sedi coinvolte, per restare al passo\ncoi tempi.'
        },
        {
          id: 'venue-reuse-neg-2',
          sentiment: 'negative',
          body: 'La comunicazione riguardo al riuso\ndelle strutture non è stata trasparente,\nera solo una strategia di marketing\ne green-washing.'
        },
        {
          id: 'venue-reuse-neg-3',
          sentiment: 'negative',
          body: 'Molti impianti esistenti rischiano di\nnon essere davvero adeguati agli standard\nrichiesti per le competizioni olimpiche.'
        }

      ]
    },
    {
      id: 'climate-impact',
      title: 'Impatto climatico',
      description:
        'Il report ufficiale di sostenibilità stima le emissioni complessive di circa 1.005.000 tonnellate di CO₂ equivalente per la realizzazione dell’evento, suddivise nel seguente modo: 30% per la pianificazione e realizzazione dei Giochi, 29% per la costruzione di infrastrutture permanenti, e 41% per le attività correlate.',
      sources: [
        {
          label: 'OLYMPICS',
          url: 'https://gstatic.olympics.com/s3/mc2026/documents/Sustainability%20-%20Now26/Sustainability%20Report/Rapporto_Sostenibilita_Impatto_Legacy_2024.pdf'
        }
      ],
      comments: [
        {
          id: 'climate-impact-pos-1',
          sentiment: 'positive',
          body: 'Il fatto che parte delle emissioni sia legata\na infrastrutture permanenti suggerisce\ninvestimenti utili anche dopo i Giochi.'
        },
        {
          id: 'climate-impact-pos-2',
          sentiment: 'positive',
          body: 'È ammirevole che vengano rilasciate pubblicamente queste informazioni: Olimpiadi trasparenti e sostenibili!'
        },
        {
          id: 'climate-impact-pos-3',
          sentiment: 'positive',
          body: 'Suddividere le emissioni per fasi consente\ndi individuare con precisione le aree\nsu cui intervenire per ridurre l’impatto\nambientale.'
        },
        {
          id: 'climate-impact-neg-1',
          sentiment: 'negative',
          body: 'Un milione di tonnellate di CO₂ sono\nancora troppe per poter chiamare\nqueste Olimpiadi “sostenibili”.'
        },
        {
          id: 'climate-impact-neg-2',
          sentiment: 'negative',
          body: 'Possono spacciarla come una conquista,\nma bisogna vedere cosa viene considerato\nnel conteggio, conviene diffidare.'
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
      sources: [
        {
          label: 'REUTERS',
          url: 'https://www.reuters.com/sustainability/climate-energy/snowmakers-feel-heat-climate-change-tests-milano-cortina-winter-games-2026-01-27/'
        }
      ],
      comments: [
        {
          id: 'artificial-snow-pos-1',
          sentiment: 'positive',
          body: 'Garantire piste adeguate può avere\nricadute positive anche sul turismo\ninvernale delle località coinvolte.'
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
          body: 'Produrre una tale quantità di metri cubi\ndi neve artificiale comporta un enorme\nconsumo di acqua ed energia.'
        },
        {
          id: 'artificial-snow-neg-2',
          sentiment: 'negative',
          body: 'La necessità di produrre neve artificiale\nè indicatore di un’edizione dei Giochi\npoco sostenibile.'
        },
        {
          id: 'artificial-snow-neg-3',
          sentiment: 'negative',
          body: 'Affidarsi alla neve tecnica per le competizioni renderà sempre meno naturale l’esperienza degli sport invernali.'
        }
      ]
    }
  ],
  feedback: {
    ALL_NEGATIVE: `L'impatto dei Giochi sull'ecosistema territoriale è stato distruttivo, irreversibile e ingiustificabile. Le Olimpiadi di Milano-Cortina 2026 non possono in alcun modo essere considerate sostenibili.`,
    MOSTLY_NEGATIVE: `Le misure di compensazione ambientale dichiarate dai canali ufficiali sono insufficienti rispetto all'impatto che i Giochi hanno avuto sul territorio locale.`,
    NEUTRAL: `Va riconosciuto un impegno reale verso un'edizione dei Giochi più sostenibile, ma un evento di questa portata genera inevitabilmente un'impronta ecologica pesante, su cui si può ancora migliorare.`,
    MOSTLY_POSITIVE: `Queste Olimpiadi si possono considerare una vittoria per la sostenibilità dei grandi eventi, le emissioni sono compromessi inevitabili nell'epoca del cambiamento climatico.`,
    ALL_POSITIVE: `Milano-Cortina 2026 stabilirà un nuovo standard mondiale per i grandi eventi, dimostrando che è possibile coniugare l'efficienza infrastrutturale con il rispetto assoluto dell'ambiente.`
  },
};