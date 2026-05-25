# Styles

Design system 

## Struttura

- **primitives/** — Valori grezzi (palette colori completa, scala spacing, scala radius).
- **tokens/** — Token semantici che usano le primitives (es. `--color-text-primary`).
- **global/** — Reset CSS, typography globale, regole base applicate a tutto il sito.

## Regola
Le primitives non vanno mai usate direttamente nei componenti. Si usano sempre i tokens.