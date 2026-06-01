<script lang="ts">
  import CommentCard from '$lib/components/cards/CommentCard.svelte';
  import { sustainabilitySection } from '$lib/data/sustainability';

  /* Pull the first comment of the first topic from real data. */
  const testComment = sustainabilitySection.topics[0].comments[0];

  /* Local like state owned by this page (controlled pattern). */
  let liked = $state(false);

  function handleToggleLike() {
    liked = !liked;
  }
</script>


<h1 class="page-title">Test CommentCard — Fase A</h1>

<p>Clicca sul cuore per testare il toggle:</p>

<CommentCard
  comment={testComment}
  sectionId="sustainability"
  {liked}
  onToggleLike={handleToggleLike}
/>

<p class="status">
  Stato del like: <strong>{liked ? '✅ liked' : '⚪ non liked'}</strong>
</p>


<style>
  :global(body) {
    padding: var(--spacing-xl);
  }

  .page-title {
    font: var(--text-page-title-font);
    margin-bottom: var(--spacing-lg);
  }

  p {
    margin-bottom: var(--spacing-md);
  }

  .status {
    margin-top: var(--spacing-lg);
  }
</style>