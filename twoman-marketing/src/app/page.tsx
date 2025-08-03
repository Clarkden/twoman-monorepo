import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-col items-center flex-1 py-40 gap-20 ">
      <h1 className="text-5xl font-black">
        Dating But
        <span className="text-black"> Fun.</span>
      </h1> 
      <div className="flex flex-row gap-3 items-center w-full md:justify-center">
        <a
          href="https://apps.apple.com/us/app/2-man/id6505080080"
          className="text-2xl font-bold flex flex-row gap-4 items-center"
        >
          <Image
            src="/images/download-on-appstore.svg"
            width={150}
            height={50}
            alt="Download"
          />
        </a>
      </div>
    </main>
  );
}
