<script lang="ts">
  import { page } from "$app/stores";
  import { PUBLIC_API_URL } from "$env/static/public";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {GetAuthSession} from "$lib/utils"

  interface AdminUpdateProfileRequest {
    name: string;
    username: string;
    bio: string;
    image1: string;
    image2: string;
    image3: string;
    image4: string;
    date_of_birth: string;
    lat: number;
    lon: number;
    education: string;
    interests: string;
    occupation: string;
    gender: string;
    preferred_gender: string;
    preferred_age_min: number;
    preferred_age_max: number;
    preferred_distance_max: number;
  }

  let profileLoaded = false;
  let username: string = "";
  let name: string = "";
  let bio: string = "";
  let gender: string = "";
  let date_of_birth: Date = new Date();
  let date_of_birth_string: string = ""
  let education: string = "";
  let occupation: string = "";
  let interests: string = "";
  let image1: string = "";
  let image2: string = "";
  let image3: string = "";
  let image4: string = "";
  let preferred_gender: string = "";
  let preferred_age_min: number = 0;
  let preferred_age_max: number = 0;
  let preferred_distance_max: number = 0;
  let lat: number = 0;
  let lon: number = 0;

  function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}


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
        username = data.data.username;
        name = data.data.name;
        bio = data.data.bio;
        gender = data.data.gender;
        date_of_birth = new Date(data.data.date_of_birth)
        date_of_birth_string = formatDate(new Date(data.data.date_of_birth))
        education = data.data.education;
        occupation = data.data.occupation;
        interests = data.data.interests;
        image1 = data.data.image1;
        image2 = data.data.image2;
        image3 = data.data.image3;
        image4 = data.data.image4;
        preferred_gender = data.data.preferred_gender;
        preferred_age_min = data.data.preferred_age_min;
        preferred_age_max = data.data.preferred_age_max;
        preferred_distance_max = data.data.preferred_distance_max;

        profileLoaded = true;
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updateProfile = async () => {
    if (!profileLoaded) {
      console.log("Profile Not Loaded");
      return;
    }

    try {
      const requestBody: AdminUpdateProfileRequest = {
        username,
        name,
        bio,
        gender,
        date_of_birth: date_of_birth.toISOString(),
        education,
        occupation,
        interests,
        image1,
        image2,
        image3,
        image4,
        lat,
        lon,
        preferred_gender,
        preferred_age_min,
        preferred_age_max,
        preferred_distance_max,
      };

      const response = await fetch(
        PUBLIC_API_URL + "/admin/users/profiles/" + $page.params.id,
        {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (data.success) {
        window.location.replace("/dashboard/profiles/" + $page.params.id);
      }
    } catch (error) {
      console.log(error);
    }
  };

  onMount(() => {
    fetchProfile();
  });
</script>

{#if profileLoaded}
  <form on:submit|preventDefault={updateProfile} class="w-full">
    <div class="flex flex-col gap-4 p-2 md:p-10 w-full">
      <div class="flex flex-col gap-1 w-full">
        <Label for="username">Username</Label>
        <Input id="username" bind:value={username} />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="name">Name</Label>
        <Input id="name" bind:value={name} />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="bio">Bio</Label>
        <Input id="bio" bind:value={bio} />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="gender">Gender</Label>
        <select id="gender" bind:value={gender} class="p-2 border border-input rounded-md bg-transparent">
          <option value="" disabled>Select a gender</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="date_of_birth">Date of Birth</Label>
        <Input 
          type="date" 
          id="date_of_birth" 
          bind:value={date_of_birth_string} 
          on:change={() => date_of_birth = new Date(date_of_birth_string)}
        />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="education">Education</Label>
        <Input id="education" bind:value={education} />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="occupation">Occupation</Label>
        <Input id="occupation" bind:value={occupation} />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="interests">Interests</Label>
        <Input id="interests" bind:value={interests} />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="image1">Image 1</Label>
        <Input id="image1" bind:value={image1} />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="image2">Image 2</Label>
        <Input id="image2" bind:value={image2} />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="image3">Image 3</Label>
        <Input id="image3" bind:value={image3} />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="image4">Image 4</Label>
        <Input id="image4" bind:value={image4} />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="lat">Latitude</Label>
        <input
          id="lat"
          type="number"
          step="0.0001"
          class="p-2 border border-input rounded-md bg-transparent"
          bind:value={lat}
        />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="lon">Longitude</Label>
        <input
          id="lon"
          type="number"
          step="0.0001"
          class="p-2 border border-input rounded-md bg-transparent"
          bind:value={lon}
        />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="preferred_gender">Preferred Gender</Label>
        <select id="preferred_gender" bind:value={preferred_gender} class="p-2 border border-input rounded-md bg-transparent">
          <option value="" disabled>Select a gender</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="preferred_age_min">Preferred Age Min</Label>
        <input
          type="number"
          id="preferred_age_min"
          class="p-2 border border-input rounded-md bg-transparent"
          bind:value={preferred_age_min}
        />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="preferred_age_max">Preferred Age Max</Label>
        <input
          type="number"
          id="preferred_age_max"
          class="p-2 border border-input rounded-md bg-transparent"
          bind:value={preferred_age_max}
        />
      </div>
      <div class="flex flex-col gap-1 w-full">
        <Label for="preferred_distance_max">Preferred Distance Max</Label>
        <input
          type="number"
          id="preferred_distance_max"
          class="p-2 border border-input rounded-md bg-transparent"
          bind:value={preferred_distance_max}
        />
      </div>
      <div>
        <Button
          variant="secondary"
          type="button"
          on:click={() =>
            window.location.replace("/dashboard/profiles/" + $page.params.id)}
          >Cancel</Button
        >
        <Button type="submit">Update</Button>
      </div>
    </div>
  </form>
{/if}
