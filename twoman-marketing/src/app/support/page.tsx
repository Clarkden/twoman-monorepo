export default function Support() {
  return (
    <main className="flex flex-col items-center flex-1 py-40 gap-20">
      <h1 className="text-5xl font-black text-center">
        Support &<span className="text-black"> Help</span>
      </h1>

      <div className="flex flex-col gap-8 items-center max-w-2xl text-center">
        <p className="text-xl">
          Need help with 2 Man? We're here to support you!
        </p>

        <div className="bg-white/10 rounded-lg p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4">Contact Support</h2>
          <p className="text-lg mb-4">
            For any questions, issues, or feedback, please reach out to us:
          </p>
          <a
            href="mailto:support@twoman.dating"
            className="text-2xl font-bold text-white hover:text-gray-200 underline"
          >
            support@twoman.dating
          </a>
        </div>

        <div className="bg-white/10 rounded-lg p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4">Common Questions</h2>
          <div className="text-left space-y-4">
            <div>
              <h3 className="font-bold">How do I delete my account?</h3>
              <p>
                You can delete your account within the app on the settings tab.
              </p>
            </div>
            <div>
              <h3 className="font-bold">How do I report a problem?</h3>
              <p>Email us with details about the issue you're experiencing.</p>
            </div>
            <div>
              <h3 className="font-bold">Privacy concerns?</h3>
              <p>
                Check our{" "}
                <a href="/privacy" className="underline">
                  Privacy Policy
                </a>{" "}
                or contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
