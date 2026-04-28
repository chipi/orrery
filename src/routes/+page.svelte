<script lang="ts">
  const routes = [
    { href: '/moon', label: 'Moon Map' },
    { href: '/explore', label: 'Solar System Explorer' },
    { href: '/plan', label: 'Mission Configurator' },
    { href: '/fly', label: 'Mission Arc' },
    { href: '/missions', label: 'Mission Library' },
    { href: '/earth', label: 'Earth Orbit' },
  ];
</script>

<svelte:head>
  <title>Orrery</title>
</svelte:head>

<section>
  <h1>Orrery</h1>
  <p>Mission Simulator · scaffolding in progress</p>
  <ul>
    {#each routes as { href, label } (href)}
      <li><a {href}>{label}</a></li>
    {/each}
  </ul>
</section>

<style>
  section {
    padding: 32px;
    max-width: 720px;
  }
  h1 {
    margin: 0 0 8px;
  }
  p {
    margin: 0 0 24px;
    opacity: 0.6;
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    padding: 8px 0;
  }
  a {
    color: #4466ff;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
</style>
