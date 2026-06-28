<script lang="ts">
  import TextBlock from '$lib/components/section/TextBlock.svelte';
  import CommentList from '$lib/components/section/CommentList.svelte';
  import { getSectionById } from '$lib/data/sections';

  /* Use the first infrastructure topic for a realistic preview. */
  const section = getSectionById('infrastructure');
  const topic = section!.topics[0];

  /* Liked state lives here (the "parent"), keyed by comment id. */
  let likes = $state<Record<string, boolean>>({});

  function toggleLike(id: string) {
    likes[id] = !likes[id];
  }
</script>


<main class="stage">
  <!-- Column 1: text -->
  <div class="stage__text">
    <TextBlock
      counter="1/3"
      title={topic.title}
      body={topic.description}
      sources={topic.sources}
    />
  </div>

  <!-- Column 2: reserved space for the 3D model (empty for now) -->
  <div class="stage__model" aria-hidden="true">
    <span class="stage__model-placeholder">[ spazio modello 3D ]</span>
  </div>

  <!-- Column 3: comments -->
  <div class="stage__right">
    <p class="stage__right-heading">
      Metti like alle opinioni con cui sei d'accordo
    </p>
    <CommentList
      comments={topic.comments}
      sectionId="infrastructure"
      {likes}
      onToggleLike={toggleLike}
    />
  </div>
</main>


<style>
  :global(body) {
    background-color: var(--color-background-page);
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.72)),
      url('/images/mountain-test-bg.avif');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
  }

  .stage {
    min-height: 100vh;

    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    grid-template-rows: 1fr;
    align-items: center;
    gap: var(--spacing-xl);

    padding: var(--spacing-3xl) var(--spacing-xl);
    box-sizing: border-box;
  }

  .stage__text {
    grid-column: 1;
  }

  .stage__model {
    grid-column: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }

  .stage__model-placeholder {
    color: var(--color-text-muted, #999);
    font-size: 14px;
    border: 1px dashed var(--color-border);
    padding: var(--spacing-lg);
    border-radius: var(--radius-sm);
  }

  .stage__right {
    grid-column: 3;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .stage__right-heading {
    margin: 0;
    font-family: var(--font-family-body);
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text-primary);
  }
</style>