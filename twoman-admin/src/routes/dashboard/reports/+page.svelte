<script lang="ts">
  import { PUBLIC_API_URL } from "$env/static/public";
  import { GetAuthSession } from "$lib/utils";
  import { onMount } from "svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { slide } from "svelte/transition";

  let reports: Data.ReportWithProfiles[] = [];
  let expandedReportId: number | null = null;
  let reporterProfile: Data.Profile | null = null;
  let reportedProfile: Data.Profile | null = null;

  const fetchReports = async () => {
    try {
      const session = GetAuthSession();

      const response = await fetch(PUBLIC_API_URL + "/admin/reports", {
        headers: {
          Authorization: `Bearer ${session}`,
        },
      });

      const data =
        (await response.json()) as Api.Response<Data.ReportWithProfiles>;

      if (data.success) {
        reports = Array.isArray(data.data) ? data.data : [data.data];
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchProfile = async (userId: number) => {
    try {
      const response = await fetch(
        PUBLIC_API_URL + "/admin/users/profiles/" + userId,
        {
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
          },
        }
      );

      const data = (await response.json()) as Api.Response<Data.Profile>;

      if (data.success) {
        return data.data;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  };

  const toggleReport = async (
    reportId: number,
    reporterId: number,
    reportedId: number
  ) => {
    if (expandedReportId === reportId) {
      expandedReportId = null;
      reporterProfile = null;
      reportedProfile = null;
      return;
    }

    expandedReportId = reportId;
    reporterProfile = await fetchProfile(reporterId);
    reportedProfile = await fetchProfile(reportedId);
  };

  const deleteProfile = async (userId: number) => {
    try {
      const response = await fetch(
        PUBLIC_API_URL + "/admin/users/profiles/" + userId,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
          },
        }
      );

      const data = (await response.json()) as Api.Response<Data.Profile>;

      if (data.success) {
        // Refresh reports after deletion
        fetchReports();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteReport = async (reportId: number) => {
    try {
      const response = await fetch(
        PUBLIC_API_URL + "/admin/reports/" + reportId,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + GetAuthSession(),
          },
        }
      );

      const data = (await response.json()) as Api.Response;

      if (data.success) {
        // Refresh reports after deletion
        fetchReports();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  onMount(() => {
    fetchReports();
  });
</script>

<div class="flex flex-col gap-5">
  <h1 class="text-2xl font-bold">Reports ({reports.length})</h1>

  <div class="flex flex-col gap-4">
    {#each reports as report}
      <div class="border border-border rounded-lg p-4">
        <div class="flex justify-between items-start">
          <div class="flex flex-col gap-2">
            <p class="font-medium">Report ID: {report.id}</p>
            <p>Reason: {report.reason}</p>
            <p>Reporter: {report.reporter_username}</p>
            <p>Reported: {report.reported_username}</p>
          </div>
          <Button
            variant="outline"
            on:click={() =>
              toggleReport(report.id, report.reporter_id, report.reported_id)}
          >
            {expandedReportId === report.id ? "Hide Details" : "Show Details"}
          </Button>
        </div>

        {#if expandedReportId === report.id}
          <div transition:slide class="mt-4 border-t border-border pt-4">
            {#if reporterProfile && reportedProfile}
              <div class="grid grid-cols-2 gap-8">
                <!-- Reporter Profile -->
                <div class="flex flex-col gap-4">
                  <h3 class="text-lg font-semibold">Reporter Profile</h3>
                  <div class="w-32 h-32 overflow-hidden rounded-md">
                    <img
                      src={reporterProfile.image1}
                      alt="Reporter"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <p>Name: {reporterProfile.name}</p>
                  <p>Username: {reporterProfile.username}</p>
                  <Button href="/dashboard/profiles/{reporterProfile.user_id}">
                    View Full Profile
                  </Button>
                </div>

                <!-- Reported Profile -->
                <div class="flex flex-col gap-4">
                  <h3 class="text-lg font-semibold">Reported Profile</h3>
                  <div class="w-32 h-32 overflow-hidden rounded-md">
                    <img
                      src={reportedProfile.image1}
                      alt="Reported"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <p>Name: {reportedProfile.name}</p>
                  <p>Username: {reportedProfile.username}</p>
                  <div class="flex gap-2">
                    <Button
                      href="/dashboard/profiles/{reportedProfile.user_id}"
                    >
                      View Full Profile
                    </Button>
                    <AlertDialog.Root>
                      <AlertDialog.Trigger
                        class={buttonVariants({ variant: "destructive" })}
                      >
                        Delete Account
                      </AlertDialog.Trigger>
                      <AlertDialog.Content>
                        <AlertDialog.Header>
                          <AlertDialog.Title
                            >Are you absolutely sure?</AlertDialog.Title
                          >
                          <AlertDialog.Description>
                            This action cannot be undone. This will permanently
                            delete the account.
                          </AlertDialog.Description>
                        </AlertDialog.Header>
                        <AlertDialog.Footer>
                          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                          <AlertDialog.Action
                            on:click={() => {
                              if (reportedProfile)
                                deleteProfile(reportedProfile.user_id);
                            }}
                          >
                            Delete Account
                          </AlertDialog.Action>
                        </AlertDialog.Footer>
                      </AlertDialog.Content>
                    </AlertDialog.Root>
                  </div>
                </div>
              </div>
            {:else}
              <p>Loading profiles... (Some profiles may have been deleted)</p>
            {/if}

            <!-- Move dismiss report button outside the profile check -->
            <div class="mt-4 border-t border-border pt-4">
              <AlertDialog.Root>
                <AlertDialog.Trigger
                  class={buttonVariants({ variant: "destructive" })}
                >
                  Dismiss Report
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                  <AlertDialog.Header>
                    <AlertDialog.Title>Dismiss this report?</AlertDialog.Title>
                    <AlertDialog.Description>
                      This will remove the report from the system.
                    </AlertDialog.Description>
                  </AlertDialog.Header>
                  <AlertDialog.Footer>
                    <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                    <AlertDialog.Action
                      on:click={() => deleteReport(report.id)}
                    >
                      Dismiss Report
                    </AlertDialog.Action>
                  </AlertDialog.Footer>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
