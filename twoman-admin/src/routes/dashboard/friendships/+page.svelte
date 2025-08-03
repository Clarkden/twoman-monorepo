<!-- <script lang="ts">
  import { onMount } from "svelte";
  import { PUBLIC_API_URL } from "$env/static/public";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import { CaretUpDown, Check } from "lucide-svelte";
  import { flyAndScale } from "$lib/utils";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  interface ProfileOption {
    value: string;
    label: string;
  }

  let profiles: Data.Profile[] = [];
  let selectedProfile: ProfileOption | null = null;
  let selectedProfileId: string = "";
  let friendships: Data.Friendship[] = [];
  let newFriendUsername: string = "";

  const fetchProfiles = async () => {
    try {
      const response = await fetch(PUBLIC_API_URL + "/admin/users/profiles", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("session"),
        },
      });

      const data = await response.json() as Api.Response<Data.Profile[]>;

      if (data.success) {
        profiles = data.data;
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchFriendships = async () => {
    if (!selectedProfileId) return;

    try {
      const response = await fetch(PUBLIC_API_URL + `/admin/users/profiles/${selectedProfileId}/friends`, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("session"),
        },
      });

      const data = await response.json() as Api.Response<Data.Friendship[]>;

      if (data.success) {
        friendships = data.data;
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const createFriendship = async () => {
    if (!selectedProfileId || !newFriendUsername) return;

    try {
      const response = await fetch(PUBLIC_API_URL + `/admin/users/profiles/${selectedProfileId}/friends`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("session"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newFriendUsername,
        }),
      });

      const data = await response.json() as Api.Response;

      if (data.success) {
        fetchFriendships();
        newFriendUsername = "";
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteFriendship = async (friendId: number) => {
    if (!selectedProfileId) return;

    try {
      const response = await fetch(PUBLIC_API_URL + `/admin/users/profiles/${selectedProfileId}/friends`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("session"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          friendId: friendId,
        }),
      });

      const data = await response.json() as Api.Response;

      if (data.success) {
        fetchFriendships();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleProfileChange = (newProfile: ProfileOption) => {
    selectedProfile = newProfile;
    selectedProfileId = newProfile.value;
    dispatch("profileChange", selectedProfileId);
    fetchFriendships();
  };

  $: profileOptions = profiles.map(profile => ({
    value: profile.user_id.toString(),
    label: `${profile.name} (${profile.username})`
  }));

  $: if (selectedProfileId) {
    fetchFriendships();
  }

  onMount(() => {
    fetchProfiles();
  });
</script>

<h1 class="text-2xl font-bold mb-4">Friendships</h1>

<div class="mb-8">
  <h2 class="text-xl font-semibold mb-2">Select Profile</h2>
  <Select.Root selected={selectedProfile} onSelectedChange={handleProfileChange}>
    <Select.Trigger class="w-full">
      <Select.Value placeholder="Select a profile" />
    </Select.Trigger>
    <Select.Content>
      <Select.Group>
        <Select.Label>Profiles</Select.Label>
        {#each profileOptions as profile}
          <Select.Item value={profile}>{profile.label}</Select.Item>
        {/each}
      </Select.Group>
    </Select.Content>
  </Select.Root>
</div>

{#if selectedProfileId}
  <div class="mb-8">
    <h2 class="text-xl font-semibold mb-2">Create New Friendship</h2>
    <form on:submit|preventDefault={createFriendship} class="space-y-4">
      <div>
        <Label for="newFriendUsername">Friend's Username</Label>
        <Input
          type="text"
          id="newFriendUsername"
          bind:value={newFriendUsername}
          required
          placeholder="Enter friend's username"
        />
      </div>
      <Button type="submit">Create Friendship</Button>
    </form>
  </div>

  <div>
    <h2 class="text-xl font-semibold mb-2">Existing Friendships</h2>
    <table class="w-full">
      <thead>
        <tr>
          <th>ID</th>
          <th>Friend Name</th>
          <th>Friend Username</th>
          <th>Accepted</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each friendships as friendship}
          <tr>
            <td>{friendship.ID}</td>
            <td>{friendship.Friend.name}</td>
            <td>{friendship.Friend.username}</td>
            <td>{friendship.accepted ? 'Yes' : 'No'}</td>
            <td>
              <Button on:click={() => deleteFriendship(friendship.FriendID)}>Delete</Button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if} -->