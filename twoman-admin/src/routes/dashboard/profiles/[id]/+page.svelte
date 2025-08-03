<script lang="ts">
  import { page } from "$app/stores";
  import { PUBLIC_API_URL } from "$env/static/public";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as Dialog from "$lib/components/ui/dialog";
  import { slide } from "svelte/transition";
  import { Switch } from "$lib/components/ui/switch";
  import { onMount } from "svelte";
  import {GetAuthSession} from "$lib/utils"


  let editingProfile = false;
  let editingProfileFriends = false;
  let editingProfileMatches = false;

  let profile: Data.Profile | null = null;
  let friends: Data.Friendship[] = [];
  let allProfiles: Data.Profile[] = [];
  let matches: Data.Match[] = [];
  let targetProfileFriends: Data.Friendship[] = [];

  let friendDialogVisible = false;
  let newFriendUsername = "";

  let createMatchDialogVisible = false;
  let newMatch = {
    friend_id: 0,
    target_id: 0,
    second_target_id: 0,
    is_duo: false,
    state: "pending",
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(
        PUBLIC_API_URL + "/admin/users/profiles/" + $page.params.id,
        {
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
          },
        }
      );

      const data = (await response.json()) as Api.Response<Data.Profile>;

      if (data.success) {
        profile = data.data;
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updateProfile = async () => {
    if (!profile) return;

    try {
      const response = await fetch(
        PUBLIC_API_URL + "/admin/users/profiles/" + $page.params.id,
        {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: profile.name,
            bio: profile.bio,
            image1: profile.image1,
            image2: profile.image2,
            image3: profile.image3,
            image4: profile.image4,
            education: profile.education,
            occupation: profile.occupation,
            interests: profile.interests,
            gender: profile.gender,
            preferred_gender: profile.preferred_gender,
            preferred_age_min: profile.preferred_age_min,
            preferred_age_max: profile.preferred_age_max,
            preferred_distance_max: profile.preferred_distance_max,
          }),
        }
      );

      const data = (await response.json()) as Api.Response<Data.Profile>;

      if (data.success) {
        editingProfile = false;
        fetchProfile();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteProfile = async () => {
    try {
      const response = await fetch(
        PUBLIC_API_URL + "/admin/users/profiles/" + $page.params.id,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
          },
        }
      );

      const data = (await response.json()) as Api.Response<Data.Profile>;

      if (data.success) {
        window.location.href = "/dashboard/profiles";
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchProfileFriends = async () => {
    try {
      const response = await fetch(
        PUBLIC_API_URL +
          "/admin/users/profiles/" +
          $page.params.id +
          "/friends",
        {
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
          },
        }
      );

      const data = (await response.json()) as Api.Response<Data.Friendship[]>;

      if (data.success) {
        friends = data.data;
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAllProfiles = async () => {
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
        allProfiles = Array.isArray(data.data) ? data.data : [data.data];
      }
    } catch (error) {
      console.log(error);
    }
  };

  const createFriendship = async () => {
    if (!profile) return;

    try {
      const response = await fetch(
        PUBLIC_API_URL + `/admin/users/profiles/${profile.user_id}/friends`,
        {
          method: "POST",
          body: JSON.stringify({
            username: newFriendUsername,
          }),
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
          },
        }
      );

      const data = (await response.json()) as Api.Response;

      if (data.success) {
        fetchProfileFriends();
        friendDialogVisible = false;
      } else {
        alert(`Error:  ${data.error}`);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteFriendship = async (friendId: number) => {
    try {
      const response = await fetch(
        PUBLIC_API_URL + `/admin/users/profiles/${profile?.user_id}/friends`,
        {
          method: "DELETE",
          body: JSON.stringify({
            friend_id: friendId,
          }),
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
          },
        }
      );

      const data = (await response.json()) as Api.Response;

      if (data.success) {
        fetchProfileFriends();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMatches = async () => {
    if (!profile) return;

    try {
      const response = await fetch(
        PUBLIC_API_URL + `/admin/users/profiles/${profile.user_id}/matches`,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
          },
        }
      );

      const data = (await response.json()) as Api.Response<Data.Match[]>;

      if (data.success) {
        matches = data.data;
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchTargetProfileFriends = async () => {
    try {
      const response = await fetch(
        PUBLIC_API_URL + `/admin/users/profiles/${newMatch.target_id}/friends`,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
          },
        }
      );

      const data = (await response.json()) as Api.Response<Data.Friendship[]>;

      if (data.success) {
        targetProfileFriends = data.data;
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const createMatch = async () => {
    if (!profile) return;

    try {
      const response = await fetch(
        PUBLIC_API_URL + `/admin/users/profiles/${profile?.user_id}/matches`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
          },
          body: JSON.stringify(newMatch),
        }
      );

      const data = (await response.json()) as Api.Response;

      if (data.success) {
        fetchMatches();
        newMatch = {
          friend_id: 0,
          target_id: 0,
          second_target_id: 0,
          is_duo: false,
          state: "pending",
        };
        createMatchDialogVisible = false;
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const setMatchRejected = async (matchId: number) => {
    console.log("deleting match");

    try {
      const response = await fetch(
        PUBLIC_API_URL + `/admin/users/profiles/${matchId}/matches`,
        {
          method: "DELETE",
          body: JSON.stringify({
            match_id: matchId,
          }),
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
          },
        }
      );

      const data = (await response.json()) as Api.Response;

      console.log(data);

      if (data.success) {
        fetchMatches();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  onMount(() => {
    fetchProfile();
  });

  $: {
    if (profile) {
      fetchProfileFriends();
      fetchMatches();
    }
  }

  $: {
    if (newMatch.target_id !== 0 && newMatch.is_duo)
      fetchTargetProfileFriends();
  }
</script>

<div class="flex flex-col w-full items-start">
  {#if profile}
    <div class="flex flex-row gap-4 mb-4">
      <div>
        <div class="w-20 h-20 overflow-hidden rounded-md">
          <img
            src={profile.image1}
            class="w-full h-full object-cover"
            alt={profile.username}
          />
        </div>
      </div>
      <div>
        <p>User ID: {profile.user_id}</p>
        <p>Name: {profile.name}</p>
        <p>Username: {profile.username}</p>
      </div>
    </div>
    <Button class="mb-2" href="/dashboard/profiles/{$page.params.id}/edit"
      >Edit Profile</Button
    >
    <AlertDialog.Root>
      <AlertDialog.Trigger class={buttonVariants({ variant: "destructive" })}
        >Delete Profile</AlertDialog.Trigger
      >
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
          <AlertDialog.Description>
            This action cannot be undone. This will permanently delete the
            account.
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action on:click={deleteProfile}
            >Continue</AlertDialog.Action
          >
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
    <button
      class="flex flex-row gap-2 items-center my-4"
      on:click={() => (editingProfile = !editingProfile)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class={editingProfile
          ? "flex flex-row gap-2 items-center rounded-md w-5 h-5 stroke-primary"
          : "flex flex-row gap-2 items-center rounded-md rotate-180 w-5 h-5 stroke-primary"}
        ><path d="m18 15-6-6-6 6" /></svg
      >
      <span>Edit Profile</span>
    </button>
    {#if editingProfile}
      <div transition:slide class="flex flex-col w-full">
        <form
          class="w-full flex flex-col gap-3"
          on:submit|preventDefault={updateProfile}
        >
          <div class="flex flex-col gap-1">
            <Label for="name">Name</Label>
            <Input id="name" bind:value={profile.name} />
          </div>
          <div class="flex flex-col gap-1">
            <Label for="bio">Bio</Label>
            <Input id="bio" bind:value={profile.bio} />
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="w-full h-full max-w-36 max-h-36 rounded overflow-hidden mb-2"
            >
              <img
                src={profile.image1}
                class="object-cover w-full h-full"
                alt="image1"
              />
            </div>
            <Label for="image1">Image 1</Label>
            <Input id="image1" bind:value={profile.image1} />
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="w-full h-full max-w-36 max-h-36 rounded overflow-hidden mb-2"
            >
              <img
                src={profile.image2}
                class="object-cover w-full h-full"
                alt="image2"
              />
            </div>
            <Label for="image2">Image 2</Label>
            <Input id="image2" bind:value={profile.image2} />
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="w-full h-full max-w-36 max-h-36 rounded overflow-hidden my-2"
            >
              <img
                src={profile.image3}
                class="object-cover w-full h-full"
                alt="image3"
              />
            </div>
            <Label for="image3">Image 3</Label>
            <Input id="image3" bind:value={profile.image3} />
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="w-full h-full max-w-36 max-h-36 rounded overflow-hidden mb-2"
            >
              <img
                src={profile.image4}
                class="object-cover w-full h-full"
                alt="image4"
              />
            </div>
            <Label for="image4">Image 4</Label>
            <Input id="image4" bind:value={profile.image4} />
          </div>
          <div class="flex flex-col gap-1">
            <Label for="education">Education</Label>
            <Input id="education" bind:value={profile.education} />
          </div>
          <div class="flex flex-col gap-1">
            <Label for="occupation">Occupation</Label>
            <Input id="occupation" bind:value={profile.occupation} />
          </div>
          <div class="flex flex-col gap-1">
            <Label for="interests">Interests</Label>
            <Input id="interests" bind:value={profile.interests} />
          </div>
          <div class="flex flex-col gap-1">
            <Label for="gender">Gender</Label>
            <select
              id="gender"
              bind:value={profile.gender}
              class="border border-input p-2 rounded-md bg-transparent bg-transparent"
            >
              <option value="">Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <Label for="preferred_gender">Preferred Gender</Label>
            <select
              id="preferred_gender"
              bind:value={profile.preferred_gender}
              class="border border-input p-2 rounded-md bg-transparent"
            >
              <option value="">Select preferred gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <Label for="preferred_age_min">Preferred Age Min</Label>
            <Input
              id="preferred_age_min"
              type="number"
              bind:value={profile.preferred_age_min}
            />
          </div>
          <div class="flex flex-col gap-1">
            <Label for="preferred_age_max">Preferred Age Max</Label>
            <Input
              id="preferred_age_max"
              type="number"
              bind:value={profile.preferred_age_max}
            />
          </div>
          <div class="flex flex-col gap-1">
            <Label for="preferred_distance_max">Preferred Distance Max</Label>
            <Input
              id="preferred_distance_max"
              type="number"
              bind:value={profile.preferred_distance_max}
            />
          </div>
          <Button type="submit" class="mb-5">Update Profile</Button>
        </form>
      </div>
    {/if}
    <button
      class="flex flex-row gap-2 items-center mb-4"
      on:click={() => (editingProfileFriends = !editingProfileFriends)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class={editingProfileFriends
          ? "flex flex-row gap-2 items-center rounded-md w-5 h-5 stroke-primary"
          : "flex flex-row gap-2 items-center rounded-md rotate-180 w-5 h-5 stroke-primary"}
        ><path d="m18 15-6-6-6 6" /></svg
      >
      <span>Edit Friends</span>
    </button>
    {#if editingProfileFriends}
      <div class="flex w-full flex-col gap-3" transition:slide>
        <Dialog.Root bind:open={friendDialogVisible}>
          <Dialog.Trigger
            on:click={fetchAllProfiles}
            class={buttonVariants({ variant: "default" })}
          >
            Create Friendship
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Create Friendship</Dialog.Title>
              <Dialog.Description>
                Create a new friendship for this profile.
              </Dialog.Description>
              <div class="my-5">
                <p class="my-4">Username: {profile.username}</p>
                <div>
                  <select
                    bind:value={newFriendUsername}
                    class="border border-input outline-none focus-within:border-primary rounded-md p-2 w-full"
                  >
                    <option value="" disabled>Select a profile</option>
                    {#each allProfiles as profileItem}
                      <option
                        value={profileItem.username}
                        disabled={profile.username === profileItem.username
                          ? true
                          : false}
                      >
                        {profileItem.username}
                      </option>
                    {/each}
                  </select>
                </div>
              </div>
              <Dialog.Footer>
                <Button on:click={createFriendship}>Create Friendship</Button>
              </Dialog.Footer>
            </Dialog.Header>
          </Dialog.Content>
        </Dialog.Root>
        {#each friends as friendship}
          <div class="flex flex-row gap-4 border border-border p-5 rounded">
            <div class="flex flex-col w-20 h-20 overflow-hidden rounded-md">
              <img
                class="w-full h-full object-cover"
                src={friendship.FriendID === profile?.user_id
                  ? friendship.Profile.image1
                  : friendship.Friend.image1}
                alt="friendship-{friendship.ID}"
              />
            </div>
            <div class="flex flex-col gap-1">
              <p>
                {friendship.FriendID === profile?.user_id
                  ? friendship.Profile.name
                  : friendship.Friend.name}
              </p>
              <p>
                {friendship.FriendID === profile?.user_id
                  ? friendship.Profile.username
                  : friendship.Friend.username}
              </p>
              <AlertDialog.Root>
                <AlertDialog.Trigger
                  class={buttonVariants({ variant: "destructive" })}
                  >Delete Friendship</AlertDialog.Trigger
                >
                <AlertDialog.Content>
                  <AlertDialog.Header>
                    <AlertDialog.Title
                      >Are you absolutely sure?</AlertDialog.Title
                    >
                    <AlertDialog.Description>
                      This action cannot be undone. This will permanently delete
                      this friendship.
                    </AlertDialog.Description>
                  </AlertDialog.Header>
                  <AlertDialog.Footer>
                    <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                    <AlertDialog.Action
                      on:click={() =>
                        deleteFriendship(
                          friendship.FriendID === profile?.user_id
                            ? friendship.ProfileID
                            : friendship.FriendID
                        )}>Continue</AlertDialog.Action
                    >
                  </AlertDialog.Footer>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </div>
          </div>
        {/each}
      </div>
    {/if}
    <button
      class="flex flex-row gap-2 items-center mb-4"
      on:click={() => (editingProfileMatches = !editingProfileMatches)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class={editingProfileMatches
          ? "flex flex-row gap-2 items-center rounded-md w-5 h-5 stroke-primary"
          : "flex flex-row gap-2 items-center rounded-md rotate-180 w-5 h-5 stroke-primary"}
        ><path d="m18 15-6-6-6 6" /></svg
      >
      <span>Edit Matches</span>
    </button>
    {#if editingProfileMatches}
      <div transition:slide>
        <Dialog.Root bind:open={createMatchDialogVisible}>
          <Dialog.Trigger
            on:click={() => {
              fetchMatches();
              fetchAllProfiles();
            }}
            class={buttonVariants({ variant: "default" })}
          >
            Create Match
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Create Match</Dialog.Title>
              <Dialog.Description>
                Create a new match for this profile.
              </Dialog.Description>
              <div
                class="my-5 items-start flex flex-col justify-start w-full gap-4"
              >
                <p>Username: {profile.username}</p>
                <div
                  class="w-full flex flex-col gap-2 items-start justify-start"
                >
                  <Label for="isDuoSwitch">Is Duo</Label>
                  <Switch id="isDuoSwitch" bind:checked={newMatch.is_duo} />
                </div>
                <div
                  class="w-full flex flex-col gap-2 items-start justify-start"
                >
                  <Label for="targetSelect">Target Select</Label>
                  <select
                    id="targetSelect"
                    bind:value={newMatch.target_id}
                    class="border border-input outline-none focus-within:border-primary rounded-md p-2 w-full"
                  >
                    <option value={0} disabled>Select a target</option>
                    {#each allProfiles as profile}
                      <option value={profile.user_id}>
                        {profile.username}
                      </option>
                    {/each}
                  </select>
                </div>
                {#if newMatch.is_duo}
                  <div
                    class="w-full flex flex-col gap-2 items-start justify-start"
                  >
                    <Label for="friendSelect">Friend Select</Label>
                    <select
                      id="friendSelect"
                      bind:value={newMatch.friend_id}
                      class="border border-input outline-none focus-within:border-primary rounded-md p-2 w-full"
                    >
                      <option value={0} disabled>Select a friend</option>
                      {#each friends as friendship}
                        <option
                          value={friendship.ProfileID === profile.user_id
                            ? friendship.FriendID
                            : friendship.ProfileID}
                        >
                          {friendship.ProfileID === profile.user_id
                            ? friendship.Friend.username
                            : friendship.Profile.username}
                        </option>
                      {/each}
                    </select>
                  </div>
                {/if}
                {#if newMatch.target_id !== 0 && newMatch.is_duo}
                  <div
                    class="w-full flex flex-col gap-2 items-start justify-start"
                  >
                    <Label for="secondTargetSelect"
                      >Second Target Select (Optional)</Label
                    >
                    <select
                      id="secondTargetSelect"
                      bind:value={newMatch.second_target_id}
                      class="border border-input outline-none focus-within:border-primary rounded-md p-2 w-full"
                    >
                      <option value={0} disabled>Select a friend</option>
                      {#each targetProfileFriends as friendship}
                        <option
                          value={friendship.ProfileID === profile.user_id
                            ? friendship.FriendID
                            : friendship.ProfileID}
                        >
                          {friendship.ProfileID === profile.user_id
                            ? friendship.Friend.username
                            : friendship.Profile.username}
                        </option>
                      {/each}
                    </select>
                  </div>
                {/if}
                <div
                  class="w-full flex flex-col gap-2 items-start justify-start"
                >
                  <Label for="state">State</Label>
                  <select
                    id="select"
                    bind:value={newMatch.state}
                    class="border border-input outline-none focus-within:border-primary rounded-md p-2 w-full"
                  >
                    <option value="" disabled>Select a state</option>
                    <option value="rejected">Rejected</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                  </select>
                </div>
              </div>
              <Dialog.Footer>
                <Button on:click={createMatch}>Create Match</Button>
              </Dialog.Footer>
            </Dialog.Header>
          </Dialog.Content>
        </Dialog.Root>
      </div>
      <div class="w-full my-5 flex flex-col gap-5">
        {#each matches as match}
          <div class="flex flex-row gap-4 border border-border p-5 rounded">
            <div class="flex flex-col gap-1">
              <p>ID: {match.ID}</p>
              <p>Profile1: {match.profile1.username}</p>
              {#if match.is_duo}
                <p>Profile2: {match.profile2?.username}</p>
              {/if}
              <p>Profile3: {match.profile3.username}</p>
              {#if match.is_duo}
                <p>Profile4: {match.profile4?.username}</p>
              {/if}
              <p>IsDuo: {match.is_duo}</p>
              <p>Status: {match.status}</p>
              {#if match.status !== "rejected"}
                <AlertDialog.Root>
                  <AlertDialog.Trigger
                    class={buttonVariants({ variant: "destructive" })}
                    >Set Rejected</AlertDialog.Trigger
                  >
                  <AlertDialog.Content>
                    <AlertDialog.Header>
                      <AlertDialog.Title
                        >Are you absolutely sure?</AlertDialog.Title
                      >
                      <AlertDialog.Description>
                        This will update the match status to rejected.
                      </AlertDialog.Description>
                    </AlertDialog.Header>
                    <AlertDialog.Footer>
                      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                      <AlertDialog.Action
                        on:click={() => setMatchRejected(match.ID)}
                        >Continue</AlertDialog.Action
                      >
                    </AlertDialog.Footer>
                  </AlertDialog.Content>
                </AlertDialog.Root>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
