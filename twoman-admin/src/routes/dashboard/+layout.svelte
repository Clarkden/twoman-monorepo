<script lang="ts">
  let mobileNavOpen = false;

  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      window.location.reload();
    } catch (error) {
      console.log(error);
    }
  };
</script>

<div class="min-h-screen bg-background text-foreground">
  <nav class="bg-primary text-primary-foreground">
    <div class="container mx-auto flex justify-between items-center p-4">
      <a href="/dashboard" class="text-xl font-bold">Admin Dashboard</a>
      <ul class="hidden md:flex space-x-4">
        <li><a href="/dashboard" class="hover:underline">Home</a></li>
        <li>
          <a href="/dashboard/profiles" class="hover:underline">Profiles</a>
        </li>
        <li>
          <a href="/dashboard/matches" class="hover:underline">Matches</a>
        </li>
        <li>
          <a href="/dashboard/friendships" class="hover:underline"
            >Friendships</a
          >
        </li>
        <li><a href="/dashboard/flags" class="hover:underline">Flags</a></li>
        <li>
          <a href="/dashboard/reports" class="hover:underline">Reports</a>
        </li>
        <li><button on:click={logout}>Logout</button></li>
      </ul>
      <button
        class="md:hidden"
        on:click={() => (mobileNavOpen = !mobileNavOpen)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-menu w-6 h-6"
          ><line x1="4" x2="20" y1="12" y2="12" /><line
            x1="4"
            x2="20"
            y1="6"
            y2="6"
          /><line x1="4" x2="20" y1="18" y2="18" /></svg
        >
      </button>
    </div>
  </nav>

  {#if mobileNavOpen}
    <div class="md:hidden bg-primary/90 p-4">
      <ul class="space-y-2">
        <li>
          <a
            href="/dashboard"
            class="block hover:underline"
            on:click={() => (mobileNavOpen = false)}>Home</a
          >
        </li>
        <li>
          <a
            href="/dashboard/profiles"
            class="block hover:underline"
            on:click={() => (mobileNavOpen = false)}>Profiles</a
          >
        </li>
        <li>
          <a
            href="/dashboard/matches"
            class="block hover:underline"
            on:click={() => (mobileNavOpen = false)}>Matches</a
          >
        </li>
        <li>
          <a
            href="/dashboard/friendships"
            class="block hover:underline"
            on:click={() => (mobileNavOpen = false)}>Friendships</a
          >
        </li>
        <li>
          <a
            href="/dashboard/flags"
            class="block hover:underline"
            on:click={() => (mobileNavOpen = false)}>Flags</a
          >
        </li>
        <li>
          <a
            href="/dashboard/reports"
            class="block hover:underline"
            on:click={() => (mobileNavOpen = false)}>Reports</a
          >
        </li>
        <li>
          <button on:click={logout}>Logout</button>
        </li>
      </ul>
    </div>
  {/if}

  <main class="container mx-auto p-4">
    <slot />
  </main>
</div>
