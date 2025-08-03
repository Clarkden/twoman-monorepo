<script lang="ts">
  import { PUBLIC_API_URL } from "$env/static/public";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import Switch from "$lib/components/ui/switch/switch.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { onMount } from "svelte";
  import {GetAuthSession} from "$lib/utils"

  let newFlagName = "";
  let newFlagIsEnabled = false;

  let flags: Data.FeatureFlag[] = [];

  let updatingFlag = false;

  const fetchFlags = async () => {
    try {
      const response = await fetch(PUBLIC_API_URL + `/admin/flags`, {
        headers: {
          Authorization: "Bearer " + GetAuthSession(),
        },
        method: "GET",
      });

      const data = (await response.json()) as Api.Response<Data.FeatureFlag[]>;

      if (data.success) {
        flags = data.data;
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const createFlag = async () => {
    if (!newFlagName) {
      alert("Flag must have a name");
    }

    try {
      const response = await fetch(PUBLIC_API_URL + `/admin/flags`, {
        headers: {
          Authorization: "Bearer " + GetAuthSession(),
        },
        method: "POST",
        body: JSON.stringify({
          name: newFlagName,
          is_enabled: newFlagIsEnabled,
        }),
      });

      const data = (await response.json()) as Api.Response;

      if (data.success) {
        newFlagName = "";
        newFlagIsEnabled = false;
        fetchFlags();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updateFlag = async (flagId: number, enabled: boolean) => {
    if (updatingFlag) return;

    updatingFlag = true;

    try {
      const response = await fetch(PUBLIC_API_URL + `/admin/flags/${flagId}`, {
        headers: {
          Authorization: "Bearer " + GetAuthSession(),
        },
        method: "PATCH",
        body: JSON.stringify({
          is_enabled: enabled,
        }),
      });

      const data = (await response.json()) as Api.Response;

      if (data.success) {
        fetchFlags();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }

    updatingFlag = false;
  };

  const deleteFlag = async (flagId: number) => {
    try {
      const response = await fetch(PUBLIC_API_URL + `/admin/flags/${flagId}`, {
        headers: {
          Authorization: "Bearer " + GetAuthSession(),
        },
        method: "DELETE",
      });

      const data = (await response.json()) as Api.Response;

      if (data.success) {
        fetchFlags();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  onMount(() => {
    fetchFlags();
  });
</script>

<div class="flex flex-col gap-5 w-full">
  <div class="flex flex-col gap-4">
    <h3 class="text-lg font-semibold">New Flag</h3>
    <div class="flex flex-col gap-1">
      <Label for="name">Name</Label>
      <Input id="name" bind:value={newFlagName} />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="isEnabled">Enabled</Label>
      <Switch id="isEnabled" bind:checked={newFlagIsEnabled} />
    </div>
    <Button on:click={createFlag}>Create Flag</Button>
  </div>
  <div class="flex flex-col gap-3">
    {#each flags as flag}
      <div class="flex flex-col gap-4 border border-border p-3 rounded-md">
        <div class="flex flex-col gap-1">
          <Label for="{flag.ID}-name">Name</Label>
          <p id="{flag.ID}-name">{flag.FlagName}</p>
        </div>
        <div class="flex flex-col gap-1">
          <Label for="{flag.ID}-enabled">Enabled</Label>
          <Switch
            id="{flag.ID}-enabled"
            bind:checked={flag.IsEnabled}
            on:click={() => updateFlag(flag.ID, !flag.IsEnabled)}
          />
        </div>
        <div>
          <p>
            <span class="font-medium">Updated At:</span>
            {new Date(flag.UpdatedAt).toLocaleString()}
          </p>
        </div>
        <div>
          <AlertDialog.Root>
            <AlertDialog.Trigger
              class={buttonVariants({ variant: "destructive" })}
              >Delete</AlertDialog.Trigger
            >
            <AlertDialog.Content>
              <AlertDialog.Header>
                <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
                <AlertDialog.Description>
                  This will delete the feature flag and can lead to unexpected
                  consequences.
                </AlertDialog.Description>
              </AlertDialog.Header>
              <AlertDialog.Footer>
                <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                <AlertDialog.Action on:click={() => deleteFlag(flag.ID)}
                  >Continue</AlertDialog.Action
                >
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </div>
      </div>
    {/each}
  </div>
</div>
