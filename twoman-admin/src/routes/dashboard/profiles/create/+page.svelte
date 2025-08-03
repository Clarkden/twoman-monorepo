<script lang="ts">
  import { Label } from "$lib/components/ui/label";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { PUBLIC_API_URL } from "$env/static/public";
  import { Switch } from "$lib/components/ui/switch";

  interface RequestBody {
    phone_number: string;
    is_demo_number: boolean;
    profile: {
      name: string;
      username: string;
      bio: string;
      gender: string;
      date_of_birth: string;
      lat: number;
      lon: number;
      interests: string;
      image1: string;
      image2: string;
      image3: string;
      image4: string;
      preferred_gender: string;
      preferred_age_min: number;
      preferred_age_max: number;
      preferred_distance_max: number;
    };
  }

  let requestBody: RequestBody = {
    phone_number: "",
    is_demo_number: false,
    profile: {
      name: "",
      username: "",
      bio: "",
      gender: "",
      date_of_birth: "",
      lat: 0.0,
      lon: 0.0,
      interests: "",
      image1: "",
      image2: "",
      image3: "",
      image4: "",
      preferred_gender: "",
      preferred_age_min: 0,
      preferred_age_max: 0,
      preferred_distance_max: 0,
    },
  };

  const handleSubmit = async () => {
    if (requestBody.phone_number === "") {
      alert("Email is required");
      return;
    }

    if (requestBody.profile.name === "") {
      alert("Name is required");
      return;
    }

    if (requestBody.profile.username === "") {
      alert("Username is required");
      return;
    }

    if (requestBody.profile.bio === "") {
      alert("Bio is required");
      return;
    }

    if (requestBody.profile.date_of_birth === "") {
      alert("Date of Birth is required");
      return;
    }

    if (requestBody.profile.lat === 0) {
      alert("Latitude is required");
      return;
    }

    if (requestBody.profile.lon === 0) {
      alert("Longitude is required");
      return;
    }

    if (requestBody.profile.preferred_gender === "") {
      alert("Preferred Gender is required");
      return;
    }

    if (requestBody.profile.preferred_age_min === 0) {
      alert("Preferred Age Min is required");
      return;
    }

    if (requestBody.profile.preferred_age_max === 0) {
      alert("Preferred Age Max is required");
      return;
    }

    if (requestBody.profile.preferred_distance_max === 0) {
      alert("Preferred Distance Max is required");
      return;
    }

    if (requestBody.profile.image1 === "") {
      alert("Image 1 is required");
      return;
    }

    if (
      requestBody.profile.preferred_age_max <
      requestBody.profile.preferred_age_min
    ) {
      alert("Preferred Age Max must be greater than Preferred Age Min");
      return;
    }

    if (requestBody.profile.preferred_distance_max < 0) {
      alert("Preferred Distance Max must be greater than 0");
      return;
    }

    if (requestBody.profile.lat < -90 || requestBody.profile.lat > 90) {
      alert("Latitude must be between -90 and 90");
      return;
    }

    if (requestBody.profile.lon < -180 || requestBody.profile.lon > 180) {
      alert("Longitude must be between -180 and 180");
      return;
    }

    if (requestBody.profile.preferred_distance_max > 100) {
      alert("Preferred Distance Max must be less than 100");
      return;
    }

    try {
      let session = localStorage.getItem("session");

      const response = await fetch(PUBLIC_API_URL + "/admin/users/profiles", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + session,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = "/dashboard/profiles";
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };
</script>

<div class="flex flex-col gap-5 flex-1">
  <h2 class="text-lg font-semibold">Create Profile</h2>
  <form class="flex flex-col gap-3" on:submit|preventDefault={handleSubmit}>
    <div class="flex flex-col gap-1">
      <Label for="phone">Phone Number</Label>
      <Input
        id="phone"
        bind:value={requestBody.phone_number}
        placeholder={"+18888888888"}
      />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="demo">Demo Number</Label>
      <Switch id="demo" bind:checked={requestBody.is_demo_number} />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="name">Name</Label>
      <Input id="name" bind:value={requestBody.profile.name} />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="username">Username</Label>
      <Input id="username" bind:value={requestBody.profile.username} />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="bio">Bio</Label>
      <Input id="bio" bind:value={requestBody.profile.bio} />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="gender">Gender</Label>
      <select
        bind:value={requestBody.profile.gender}
        class="border border-input p-2 rounded-md bg-transparent"
      >
        <option value="">Select Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <Label for="date_pf_birth">Date of Birth</Label>
      <Input
        type="date"
        id="date_pf_birth"
        bind:value={requestBody.profile.date_of_birth}
      />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="lat">Latitude</Label>
      <input
        id="lat"
        type="number"
        step="0.0001"
        class="p-2 border border-input rounded-md bg-transparent"
        bind:value={requestBody.profile.lat}
      />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="lon">Longitude</Label>
      <input
        id="lon"
        type="number"
        step="0.0001"
        class="p-2 border border-input rounded-md bg-transparent"
        bind:value={requestBody.profile.lon}
      />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="interests">Interests</Label>
      <Input id="interests" bind:value={requestBody.profile.interests} />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="image1">Image 1</Label>
      <Input id="image1" bind:value={requestBody.profile.image1} />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="image2">Image 2</Label>
      <Input id="image2" bind:value={requestBody.profile.image2} />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="image3">Image 3</Label>
      <Input id="image3" bind:value={requestBody.profile.image3} />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="image4">Image 4</Label>
      <Input id="image4" bind:value={requestBody.profile.image4} />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="preferredGender">Preferred Gender</Label>
      <select
        bind:value={requestBody.profile.preferred_gender}
        class="border border-input p-2 rounded-md bg-transparent"
      >
        <option value="">Select Preferred Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <Label for="preferredAgeMin">Preferred Age Min</Label>
      <input
        id="preferredAgeMin"
        type="number"
        class="p-2 border border-input rounded-md bg-transparent"
        bind:value={requestBody.profile.preferred_age_min}
      />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="preferredAgeMax">Preferred Age Max</Label>
      <input
        id="preferredAgeMax"
        class="p-2 border border-input rounded-md bg-transparent"
        type="number"
        bind:value={requestBody.profile.preferred_age_max}
      />
    </div>
    <div class="flex flex-col gap-1">
      <Label for="preferredDistanceMax">Preferred Distance Max</Label>
      <input
        id="preferredDistanceMax"
        type="number"
        class="p-2 border border-input rounded-md bg-transparent"
        bind:value={requestBody.profile.preferred_distance_max}
      />
    </div>
    <Button type="submit" class="mb-5">Create Profile</Button>
  </form>
</div>
