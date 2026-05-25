# Components

Componenti Svelte riutilizzabili.

## Struttura

- **primitives/** — Mattoncini base (Button, Text, Icon).
- **cards/** — Componenti card (CommentCard, TopicCard, SectionChoiceCard).
- **layout/** — Componenti strutturali (Header, Footer, Grid).

## Regole
- Un componente per file.
- Ogni componente accetta props tipizzate.
- Gli stili sono scoped al componente, salvo eccezioni motivate.
- I componenti consumano tokens CSS, non primitives.