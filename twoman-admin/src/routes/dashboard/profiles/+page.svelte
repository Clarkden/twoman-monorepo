<script lang="ts">
  import { PUBLIC_API_URL } from "$env/static/public";
  import Button from "$lib/components/ui/button/button.svelte";
  import { onMount } from "svelte";
  import {GetAuthSession} from "$lib/utils"


  let profiles: Data.Profile[] = [];

  const fetchProfiles = async () => {
    try {
      let session = GetAuthSession();

      const response = await fetch(PUBLIC_API_URL + "/admin/users/profiles", {
        headers: {
          Authorization: "Bearer " + session,
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json()) as Api.Response<Data.Profile>;

      if (data.success) {
        profiles = Array.isArray(data.data) ? data.data : [data.data];
      }
    } catch (error) {
      console.log(error);
    }
  };

  let seedingDemoDatabase = false;

  const seedDemoDatabase = async () => {
    seedingDemoDatabase = true;
    try {
      let session = GetAuthSession();

      const response = await fetch(PUBLIC_API_URL + "/admin/users/demo/seed", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + session,
        },
      });

      const data = (await response.json()) as Api.Response;

      if (data.success) {
        alert("Demo database seeded with 100 more users.");
      } else {
        alert("Failed to seed demo database");
      }
    } catch (error) {
      console.log(error);
    } finally {
      seedingDemoDatabase = false;
    }
  };

  onMount(() => {
    fetchProfiles();
  });
</script>

<div class="flex flex-col gap-5">
  <div class="flex flex-row justify-between items-center gap-4">
    <h2 class="text-xl font-bold">Profiles ({profiles.length})</h2>
    <Button disabled={seedingDemoDatabase} on:click={seedDemoDatabase}
      >Seed Demo Database</Button
    >
  </div>
  <Button href="/dashboard/profiles/create">Create Profile</Button>
  <div class="flex flex-col gap-5">
    {#each profiles as profile}
      <a
        href="/dashboard/profiles/{profile.user_id}"
        class="flex flex-row gap-4"
      >
        <div class="flex flex-col w-16 h-16 rounded-md overflow-hidden">
          <img
            src={profile.image1}
            alt="{profile.user_id}image"
            class="object-cover w-full h-full"
          />
        </div>
        <div class="flex flex-col">
          <p class="text-lg font-medium">{profile.name}</p>
          <p>{profile.username}</p>
        </div>
      </a>
    {/each}
  </div>
</div>
