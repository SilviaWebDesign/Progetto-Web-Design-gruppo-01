/* ============================================================
   DATA — SPORT SECTION
   ============================================================
   Content for the Sport section.
   3 topics × 4 comments (2 positive + 2 negative).
   ============================================================ */

import type { Section } from '$lib/types';

export const sportSection: Section = {
  id: 'sport',
  title: 'Sport',
  description:
    'Le Olimpiadi vivono grazie a gare, atleti e discipline differenti. Questi eventi possono essere occasioni di crescita e partecipazione oppure competizioni incentrate su visibilità e risultati, in equilibrio tra sportività e spettacolo.',
  object3D: '3d-skater',
  topics: [
    {
      id: 'alysa-liu',
      title: 'Alysa Liu',
      description:
        'Alysa Liu si presenta come una delle protagoniste più attese del pattinaggio artistico ai Giochi Olimpici Invernali di Milano-Cortina 2026. La sua partecipazione contribuisce a rafforzare l’attenzione internazionale sull’evento, in particolare tra il pubblico più giovane e gli appassionati degli sport su ghiaccio, grazie a uno stile tecnico e spettacolare che ha già segnato diverse competizioni internazionali.',
      comments: [
        {
          id: 'alysa-liu-pos-1',
          sentiment: 'positive',
          body: 'Sembra divertirsi davvero mentre gareggia, il che ormai è raro negli sport di alto livello, Liu è un ottimo esempio per i giovani atleti.'
        },
        {
          id: 'alysa-liu-pos-2',
          sentiment: 'positive',
          body: 'Il suo ritorno in gara dopo il ritiro la rende una delle storie sportive più ispiranti dei Giochi, Alysa è un simbolo di rinascita.'
        },
        {
          id: 'alysa-liu-neg-1',
          sentiment: 'negative',
          body: 'La sua storia di discontinuità con lo sport dimostra che non prende sul serio la sua disciplina.'
        },
        {
          id: 'alysa-liu-neg-2',
          sentiment: 'negative',
          body: 'La sua performance al Gala Olimpico è stata un insulto al pattinaggio artistico, avrebbe dovuto esibirsi su musica classica, non pop.'
        }
      ]
    },
    {
      id: 'vladyslav-heraskevych',
      title: 'Vladyslav Heraskevych',
      description:
        "L'atleta ucraino Vladyslav Heraskevych è stato escluso dalla competizione di skeleton per essersi rifiutato di rimuovere un casco commemorativo, il quale riportava i volti di oltre venti atleti e allenatori ucraini uccisi dall'inizio dell'invasione russa. Questo gesto viola la Regola 50 della Carta Olimpica, che vieta qualsiasi forma di propaganda o messaggio politico, religioso o razziale sui campi di gara.",
      comments: [
        {
          id: 'vladyslav-heraskevych-pos-1',
          sentiment: 'positive',
          body: 'Il casco commemorativo non era propaganda politica ma un gesto umano di memoria verso colleghi e amici scomparsi, il provvedimento è stato ingiusto.'
        },
        {
          id: 'vladyslav-heraskevych-pos-2',
          sentiment: 'positive',
          body: 'Gli atleti dovrebbero avere la possibilità di esprimersi anche riguardo a temi non relazionati allo sport, in quanto personaggi pubblici la loro voce fa la differenza.'
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
        }
      ]
    },
    {
      id: 'jutta-leerdam',
      title: 'Jutta Leerdam',
      description:
        'La pattinatrice olandese Jutta Leerdam è diventata protagonista di una controversia a seguito della sua celebrazione per la vittoria nei 1000 metri. L’atleta ha aperto la zip della sua tuta mostrando l’abbigliamento sottostante, intimo sportivo firmato Nike. Si presume che Leerdam possa aver ricevuto circa 850.000 euro dal marchio statunitense, a causa di un contratto di sponsorizzazione.',
      comments: [
        {
          id: 'jutta-leerdam-pos-1',
          sentiment: 'positive',
          body: 'Il suo gesto è stato unicamente l’espressione delle forti emozioni che stava provando, nessuna pubblicità occulta.'
        },
        {
          id: 'jutta-leerdam-pos-2',
          sentiment: 'positive',
          body: 'La presunta collaborazione con Nike attesta semplicemente il livello sportivo di Leerman, tanto alto da poter influenzare il pubblico.'
        },
        {
          id: 'jutta-leerdam-neg-1',
          sentiment: 'negative',
          body: 'Ormai si premiano più le sponsorizzazioni che le medaglie…'
        },
        {
          id: 'jutta-leerdam-neg-2',
          sentiment: 'negative',
          body: 'Questo gesto ha spostato l’attenzione mediatica dal risultato all’immagine dell’atleta, perdendo ogni legame con lo sport.'
        }
      ]
    }
  ]
};