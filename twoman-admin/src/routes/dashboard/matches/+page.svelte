<script lang="ts">
  import { PUBLIC_API_URL } from "$env/static/public";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Label } from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import { GetAuthSession } from "$lib/utils";
  import { onMount } from "svelte";


  let matches: Data.Match[] = [];
  let profiles: Data.Profile[] = [];
  let newMatch = {
    profileId: { value: "", label: "" },
    targetId: { value: "", label: "" },
    friendId: { value: "", label: "" },
    secondTargetId: { value: "", label: "" },
    isDuo: false,
    state: { value: "pending", label: "Pending" }
  };

  const handleValueChange = (field: keyof typeof newMatch) => (value: any) => {
    newMatch[field] = value;
  };

  const fetchMatches = async () => {
    try {
      const response = await fetch(PUBLIC_API_URL + "/admin/users/profiles/matches", {
        headers: {
          Authorization: "Bearer " + GetAuthSession(),
        },
      });

      const data = await response.json() as Api.Response<Data.Match[]>;

      if (data.success) {
        matches = data.data;
      } else {
        console.log(data)
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await fetch(PUBLIC_API_URL + "/admin/users/profiles", {
        headers: {
          Authorization: "Bearer " + GetAuthSession(),
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

  const createMatch = async () => {
    try {
      const response = await fetch(PUBLIC_API_URL + `/admin/users/profiles/${newMatch.profileId.value}/matches`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + GetAuthSession(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetId: parseInt(newMatch.targetId.value),
          friendId: newMatch.isDuo ? parseInt(newMatch.friendId.value) : undefined,
          secondTargetId: newMatch.isDuo ? parseInt(newMatch.secondTargetId.value) : undefined,
          isDuo: newMatch.isDuo,
          state: newMatch.state.value,
        }),
      });

      const data = await response.json() as Api.Response;

      if (data.success) {
        fetchMatches();
        // Reset form
        newMatch = {
          profileId: { value: "", label: "" },
          targetId: { value: "", label: "" },
          friendId: { value: "", label: "" },
          secondTargetId: { value: "", label: "" },
          isDuo: false,
          state: { value: "pending", label: "Pending" }
        };
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteMatch = async (matchId: number) => {
    try {
      const response = await fetch(PUBLIC_API_URL + `/admin/matches`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + GetAuthSession(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          match_id: matchId,
        }),
      });

      const data = await response.json() as Api.Response;

      if (data.success) {
        fetchMatches();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  $: profileOptions = profiles.map(profile => ({
    value: profile.user_id.toString(),
    label: `${profile.name} (${profile.username})`
  }));

  $: stateOptions = [
    { value: "pending", label: "Pending" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Rejected" }
  ];

  onMount(() => {
    fetchMatches();
    fetchProfiles();
  });
</script>

<h1 class="text-2xl font-bold mb-4">Matches</h1>

<div class="mb-8">
  <h2 class="text-xl font-semibold mb-2">Create New Match</h2>
  <form on:submit|preventDefault={createMatch} class="space-y-4">
    <div>
      <Label for="profileId">Profile</Label>
      <Select.Root selected={newMatch.profileId} onSelectedChange={handleValueChange('profileId')}>
        <Select.Trigger class="w-full">
          <Select.Value placeholder="Select a profile" />
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            <Select.Label>Profiles</Select.Label>
            {#each profileOptions as profile}
              <Select.Item value={profile.value}>{profile.label}</Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </div>

    <div>
      <Label for="targetId">Target</Label>
      <Select.Root selected={newMatch.targetId} onSelectedChange={handleValueChange('targetId')}>
        <Select.Trigger class="w-full">
          <Select.Value placeholder="Select a target" />
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            <Select.Label>Targets</Select.Label>
            {#each profileOptions as profile}
              <Select.Item value={profile.value}>{profile.label}</Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </div>

    <div class="flex items-center space-x-2">
      <Checkbox bind:checked={newMatch.isDuo} id="isDuo" />
      <Label for="isDuo">Is Duo Match</Label>
    </div>

    {#if newMatch.isDuo}
      <div>
        <Label for="friendId">Friend</Label>
        <Select.Root selected={newMatch.friendId} onSelectedChange={handleValueChange('friendId')}>
          <Select.Trigger class="w-full">
            <Select.Value placeholder="Select a friend" />
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>Friends</Select.Label>
              {#each profileOptions as profile}
                <Select.Item value={profile.value}>{profile.label}</Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </div>

      <div>
        <Label for="secondTargetId">Second Target</Label>
        <Select.Root selected={newMatch.secondTargetId} onSelectedChange={handleValueChange('secondTargetId')}>
          <Select.Trigger class="w-full">
            <Select.Value placeholder="Select a second target" />
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>Second Targets</Select.Label>
              {#each profileOptions as profile}
                <Select.Item value={profile.value}>{profile.label}</Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </div>
    {/if}

    <div>
      <Label for="state">State</Label>
      <Select.Root selected={newMatch.state} onSelectedChange={handleValueChange('state')}>
        <Select.Trigger class="w-full">
          <Select.Value placeholder="Select a state" />
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            <Select.Label>States</Select.Label>
            {#each stateOptions as state}
              <Select.Item value={state.value}>{state.label}</Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </div>

    <Button type="submit">Create Match</Button>
  </form>
</div>

<div>
  <h2 class="text-xl font-semibold mb-2">Existing Matches</h2>
  <table class="w-full">
    <thead>
      <tr>
        <th>ID</th>
        <th>Profile 1</th>
        <th>Profile 2</th>
        <th>Profile 3</th>
        <th>Profile 4</th>
        <th>Is Duo</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each matches as match}
        <tr>
          <td>{match.ID}</td>
          <td>{match.profile1?.name} ({match.profile1?.username})</td>
          <td>{match.profile2 ? `${match.profile2.name} (${match.profile2.username})` : 'N/A'}</td>
          <td>{match.profile3?.name} ({match.profile3?.username})</td>
          <td>{match.profile4 ? `${match.profile4.name} (${match.profile4.username})` : 'N/A'}</td>
          <td>{match.is_duo ? 'Yes' : 'No'}</td>
          <td>{match.status}</td>
          <td>
            <Button on:click={() => deleteMatch(match.ID)}>Delete</Button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>