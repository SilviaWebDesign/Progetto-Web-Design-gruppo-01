/* ============================================================
   DATA — SPORT SECTION
   ============================================================
   Content for the Sport section.
   3 topics × 6 comments (3 positive + 3 negative).
   ============================================================ */

import type { Section } from '$lib/types';

export const sportSection: Section = {
  id: 'sport',
  title: 'Sport',
  description:
    'Le Olimpiadi vivono grazie a gare, atleti\ne discipline differenti. Questi eventi\npossono essere occasioni di crescita\ne partecipazione oppure competizioni\nincentrate su visibilità e risultati,\nin equilibrio tra sportività e spettacolo.',
  descriptionMobile:
    'Le Olimpiadi vivono\ngrazie a gare,\natleti e discipline\ndifferenti. Questi\neventi possono\nessere occasioni\ndi crescita e\npartecipazione\noppure competizioni\nincentrate su\nvisibilità e risultati,\nin equilibrio\ntra sportività\ne spettacolo.',
  object3D: '3d-skater',
  glbPath: '/models/sport-base.glb',
  frostImage: '/images/frost-sport.png',
  modelFitFactor: 0.8,
  cardFitFactor: 0.52,
  topics: [
    {
      id: 'alysa-liu',
      title: 'Alysa Liu',
      description:
        'Alysa Liu si presenta come una delle protagoniste più attese del pattinaggio artistico ai Giochi Olimpici Invernali di Milano-Cortina 2026. La sua partecipazione contribuisce a rafforzare l’attenzione internazionale sull’evento, in particolare tra il pubblico più giovane e gli appassionati degli sport su ghiaccio, grazie a uno stile tecnico e spettacolare che ha già segnato diverse competizioni internazionali.',
      sources: [
        { label: 'WIKIPEDIA', url: 'https://en.wikipedia.org/wiki/Alysa_Liu' }
      ],
      comments: [
        {
          id: 'alysa-liu-pos-1',
          sentiment: 'positive',
          body: 'Sembra divertirsi davvero mentre gareggia,\normai è raro negli sport di alto livello, Liu\nè un ottimo esempio per i giovani atleti.'
        },
        {
          id: 'alysa-liu-pos-2',
          sentiment: 'positive',
          body: 'Il suo ritorno in gara dopo il ritiro la rende una delle storie sportive più ispiranti dei Giochi, Alysa è un simbolo di rinascita.'
        },
        {
          id: 'alysa-liu-pos-3',
          sentiment: 'positive',
          body: 'Il suo atteggiamento “senza pressione”\nrompe gli schemi tradizionali\ndel pattinaggio, rendendo lo sport\npiù moderno e pop.'
        },
        {
          id: 'alysa-liu-neg-1',
          sentiment: 'negative',
          body: 'La sua storia di discontinuità con lo sport\ndimostra che non prende sul serio\nla sua disciplina.'
        },
        {
          id: 'alysa-liu-neg-2',
          sentiment: 'negative',
          body: 'La sua performance al Gala Olimpico\nè stata un insulto al pattinaggio artistico,\navrebbe dovuto esibirsi su musica classica,\nnon pop.'
        },
        {
          id: 'alysa-liu-neg-3',
          sentiment: 'negative',
          body: 'È solo un’atleta come le altre, ma ha ricevuto un’attenzione esagerata da parte dei media, si sentiva parlare solo di lei.'
        }
      ]
    },
    {
      id: 'vladyslav-heraskevych',
      title: 'Vladyslav Heraskevych',
      description:
        "L'atleta ucraino Vladyslav Heraskevych è stato escluso dalla competizione di skeleton per essersi rifiutato di rimuovere un casco commemorativo, il quale riportava i volti di oltre venti atleti e allenatori ucraini uccisi dall'inizio dell'invasione russa. Questo gesto viola la Regola 50 della Carta Olimpica, che vieta qualsiasi forma di propaganda o messaggio politico, religioso o razziale sui campi di gara.",
      sources: [
        {
          label: 'RAI NEWS',
          url: 'https://www.rainews.it/articoli/2026/02/il-casco-con-i-volti-degli-atleti-ucraini-uccisi-squalificato-latletadello-skeleton-heraskevych-c269b776-c601-4ec0-b7f3-6271587b9f6d.html'
        }
      ],
      comments: [
        {
          id: 'vladyslav-heraskevych-pos-1',
          sentiment: 'positive',
          body: 'Il casco commemorativo non era\npropaganda politica ma un gesto umano di\nmemoria verso colleghi e amici scomparsi,\nil provvedimento è stato ingiusto.'
        },
        {
          id: 'vladyslav-heraskevych-pos-2',
          sentiment: 'positive',
          body: 'Gli atleti dovrebbero avere la possibilità\ndi esprimersi anche riguardo a temi non\nrelazionati allo sport, in quanto personaggi\npubblici la loro voce fa la differenza.'
        },
        {
          id: 'vladyslav-heraskevych-pos-3',
          sentiment: 'positive',
          body: 'Gesti come questo rendono le Olimpiadi\npiù autentiche, perché mostrano il lato\numano dietro la competizione.'
        },
        {
          id: 'vladyslav-heraskevych-neg-1',
          sentiment: 'negative',
          body: 'È stato ingenuo da parte di Heraskevych pensare di poter raggirare il regolamento olimpico senza subirne le conseguenze.'
        },
        {
          id: 'vladyslav-heraskevych-neg-2',
          sentiment: 'negative',
          body: 'Accettare simboli legati a conflitti in corso rende molto difficile mantenere il principio di neutralità olimpica, la squalifica era necessaria.'
        },
        {
          id: 'vladyslav-heraskevych-neg-3',
          sentiment: 'negative',
          body: 'Il Comitato Olimpico ha agito\ncorrettamente, un’eccezione avrebbe\ncausato più difficoltà a far rispettare\nla stessa regola in altri casi.'
        }
      ]
    },
    {
      id: 'jutta-leerdam',
      title: 'Jutta Leerdam',
      description:
        'La pattinatrice olandese Jutta Leerdam è diventata protagonista di una controversia a seguito della sua celebrazione per la vittoria nei 1000 metri. L’atleta ha aperto la zip della sua tuta mostrando l’abbigliamento sottostante, intimo sportivo firmato Nike. Si presume che Leerdam possa aver ricevuto circa 850.000 euro dal marchio statunitense, a causa di un contratto di sponsorizzazione.',
      sources: [
        {
          label: 'CORRIERE DELLA SERA',
          url: 'https://www.corriere.it/sport/olimpiadi-invernali/26_febbraio_17/jutta-leerdam-biancheria-intima-nike-soldi-19f85a90-5ac8-4c3c-bf67-c44ef8049xlk.shtml'
        }
      ],
      comments: [
        {
          id: 'jutta-leerdam-pos-1',
          sentiment: 'positive',
          body: 'Il suo gesto è stato unicamente l’espressione delle forti emozioni che stava provando, nessuna pubblicità occulta.'
        },
        {
          id: 'jutta-leerdam-pos-2',
          sentiment: 'positive',
          body: 'La presunta collaborazione con Nike\nattesta semplicemente il livello sportivo\ndi Leerman, tanto alto da poter influenzare\nil pubblico.'
        },
        {
          id: 'jutta-leerdam-pos-3',
          sentiment: 'positive',
          body: 'La sua popolarità, aumentata anche\ndalle controversie, dona più visibilità\nal pattinaggio di velocità, sport spesso\npoco seguito.'
        },
        {
          id: 'jutta-leerdam-neg-1',
          sentiment: 'negative',
          body: 'Ormai si premiano più le sponsorizzazioni che le medaglie…'
        },
        {
          id: 'jutta-leerdam-neg-2',
          sentiment: 'negative',
          body: 'Questo gesto ha spostato l’attenzione\nmediatica dal risultato all’immagine\ndell’atleta, perdendo ogni legame\ncon lo sport.'
        },
        {
          id: 'jutta-leerdam-neg-3',
          sentiment: 'negative',
          body: 'La celebrazione sembra troppo forzata, costruita apposta per far parlare di sé oltre lo sport, da vera egocentrica.'
        }
      ]
    }
  ],
  feedback: {
    ALL_NEGATIVE: `Le Olimpiadi non sono altro che un palcoscenico iper-commercializzato, gli interessi finanziari hanno completamente eclissato i valori etici degli atleti e l'autenticità della competizione.`,
    MOSTLY_NEGATIVE: `L'organizzazione ha lasciato che le polemiche extra-sportive e le logiche di marketing superassero talvolta il valore puramente agonistico e il fascino delle performance.`,
    NEUTRAL: `Non si possono ignorare le contraddizioni di un sistema che deve scendere a pesanti compromessi tra etica, regolamenti rigidi e contratti milionari.`,
    MOSTLY_POSITIVE: `I regolamenti sono necessari per garantire la neutralità sul campo di gara, mentre i media e le sponsorizzazioni aumentano la visibilità internazionale e il coinvolgimento della comunità.`,
    ALL_POSITIVE: `Questi Giochi hanno ispirato e unito persone e territori, grazie anche agli sponsor che hanno contribuito all'attrattività dell'evento, e ai regolamenti ufficiali che hanno tutelato l'armonia della competizione.`
  },
};