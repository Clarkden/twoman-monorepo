<script lang="ts">
  import { onMount } from "svelte";
  import { PUBLIC_API_URL } from "$env/static/public";
  import { isAuthenticated } from "$lib/stores/authStore";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Label } from "$lib/components/ui/label";

  let username = "";
  let password = "";

  const login = async (): Promise<void> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = (await response.json()) as Api.Response<{ session: string }>;

      if (data.success) {
        window.location.replace("/dashboard");
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.log(error);
      alert("An error occurred during login");
    }
  };

  onMount(() => {
    const session = localStorage.getItem("session");
    if (session) {
      isAuthenticated.set(true);
      goto("/dashboard");
    }
  });
</script>

<div class="flex items-center justify-center min-h-screen bg-background">
  <Card class="w-[350px]">
    <CardHeader>
      <CardTitle>Login</CardTitle>
      <CardDescription
        >Enter your credentials to access the admin dashboard.</CardDescription
      >
    </CardHeader>
    <CardContent>
      <form on:submit|preventDefault={login}>
        <div class="grid w-full items-center gap-4">
          <div class="flex flex-col space-y-1.5">
            <Label for="username">Username</Label>
            <Input
              id="username"
              bind:value={username}
              placeholder="Enter your username"
              required
            />
          </div>
          <div class="flex flex-col space-y-1.5">
            <Label for="password">Password</Label>
            <Input
              id="password"
              type="password"
              bind:value={password}
              placeholder="Enter your password"
              required
            />
          </div>
        </div>
      </form>
    </CardContent>
    <CardFooter>
      <Button on:click={login} class="w-full">Login</Button>
    </CardFooter>
  </Card>
</div>
